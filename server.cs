
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace RetroArcade
{
    public sealed class ArcadeServer : IDisposable
    {
        private const int FieldWidth = 960;
        private const int FieldHeight = 560;
        private const int PaddleWidth = 14;
        private const int PaddleHeight = 92;
        private const int BallRadius = 10;
        private const int MaxScore = 7;
        private const double InitialBallSpeed = 6.0;

        private readonly string _rootPath;
        private readonly string _rootWithSeparator;
        private readonly string _host;
        private readonly int _port;
        private readonly TcpListener _listener;
        private readonly CancellationTokenSource _cancellation;
        private readonly object _sync;
        private readonly object _serializerSync;
        private readonly Random _random;
        private readonly JavaScriptSerializer _serializer;
        private readonly Dictionary<string, Room> _rooms;
        private readonly Dictionary<string, SocketConnection> _clients;
        private bool _disposed;

        public ArcadeServer(string rootPath, string host, int port)
        {
            _rootPath = Path.GetFullPath(rootPath);
            _rootWithSeparator = _rootPath.EndsWith(Path.DirectorySeparatorChar.ToString(), StringComparison.Ordinal)
                ? _rootPath
                : _rootPath + Path.DirectorySeparatorChar;
            _host = host;
            _port = port;
            _listener = new TcpListener(ResolveAddress(host), port);
            _cancellation = new CancellationTokenSource();
            _sync = new object();
            _serializerSync = new object();
            _random = new Random();
            _serializer = new JavaScriptSerializer();
            _serializer.MaxJsonLength = int.MaxValue;
            _rooms = new Dictionary<string, Room>(StringComparer.OrdinalIgnoreCase);
            _clients = new Dictionary<string, SocketConnection>(StringComparer.OrdinalIgnoreCase);
        }

        public async Task RunAsync()
        {
            _listener.Start();
            Console.WriteLine("Retro Arcade Server laeuft auf http://{0}:{1}/", GetDisplayHost(), _port);
            Console.WriteLine("Oeffne http://{0}:{1}/pong.html fuer Online-Pong.", GetDisplayHost(), _port);

            try
            {
                await Task.WhenAll(AcceptLoopAsync(), GameLoopAsync());
            }
            catch (TaskCanceledException)
            {
            }
            catch (ObjectDisposedException)
            {
                if (!_cancellation.IsCancellationRequested)
                {
                    throw;
                }
            }
            catch (SocketException)
            {
                if (!_cancellation.IsCancellationRequested)
                {
                    throw;
                }
            }
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;
            StopInternal();
            GC.SuppressFinalize(this);
        }

        private void StopInternal()
        {
            if (!_cancellation.IsCancellationRequested)
            {
                _cancellation.Cancel();
            }

            try
            {
                _listener.Stop();
            }
            catch
            {
            }

            List<SocketConnection> clients;
            lock (_sync)
            {
                clients = _clients.Values.ToList();
                _clients.Clear();
                _rooms.Clear();
            }

            foreach (var client in clients)
            {
                try
                {
                    CloseConnectionAsync(client).GetAwaiter().GetResult();
                }
                catch
                {
                }
                finally
                {
                    client.SendLock.Dispose();
                }
            }

            _cancellation.Dispose();
        }

        private async Task AcceptLoopAsync()
        {
            while (!_cancellation.IsCancellationRequested)
            {
                TcpClient tcpClient;
                try
                {
                    tcpClient = await _listener.AcceptTcpClientAsync();
                }
                catch (ObjectDisposedException)
                {
                    if (_cancellation.IsCancellationRequested)
                    {
                        break;
                    }
                    throw;
                }
                catch (SocketException)
                {
                    if (_cancellation.IsCancellationRequested)
                    {
                        break;
                    }
                    throw;
                }

                QueueClientHandling(tcpClient);
            }
        }

        private void QueueClientHandling(TcpClient tcpClient)
        {
            Task.Run(async () =>
            {
                await HandleTcpClientAsync(tcpClient);
            });
        }

        private async Task GameLoopAsync()
        {
            while (!_cancellation.IsCancellationRequested)
            {
                List<RoomSnapshot> snapshots;
                lock (_sync)
                {
                    snapshots = new List<RoomSnapshot>(_rooms.Count);
                    foreach (var room in _rooms.Values.ToList())
                    {
                        UpdateRoomLocked(room);
                        if (room.LeftClient != null && room.RightClient != null)
                        {
                            snapshots.Add(CreateSnapshotLocked(room));
                        }
                    }
                }

                foreach (var snapshot in snapshots)
                {
                    await BroadcastSnapshotAsync(snapshot);
                }

                try
                {
                    await Task.Delay(16, _cancellation.Token);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }
        }

        private async Task HandleTcpClientAsync(TcpClient tcpClient)
        {
            NetworkStream stream = null;
            try
            {
                stream = tcpClient.GetStream();
                var request = await ReadHttpRequestAsync(stream, _cancellation.Token);
                if (request == null)
                {
                    tcpClient.Close();
                    return;
                }

                if (IsWebSocketRequest(request))
                {
                    await HandleWebSocketClientAsync(tcpClient, stream, request);
                    return;
                }

                await ServeStaticFileAsync(stream, request.Path);
                tcpClient.Close();
            }
            catch
            {
                try
                {
                    tcpClient.Close();
                }
                catch
                {
                }
            }
        }

        private async Task ServeStaticFileAsync(NetworkStream stream, string requestPath)
        {
            var normalizedPath = string.IsNullOrWhiteSpace(requestPath) || requestPath == "/"
                ? "index.html"
                : requestPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var fullPath = Path.GetFullPath(Path.Combine(_rootPath, normalizedPath));

            if (!fullPath.StartsWith(_rootWithSeparator, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(fullPath, _rootPath, StringComparison.OrdinalIgnoreCase))
            {
                await WriteHttpResponseAsync(stream, 403, "Forbidden", Encoding.UTF8.GetBytes("Forbidden"), "text/plain; charset=utf-8");
                return;
            }

            if (!File.Exists(fullPath))
            {
                await WriteHttpResponseAsync(stream, 404, "Not Found", Encoding.UTF8.GetBytes("Not Found"), "text/plain; charset=utf-8");
                return;
            }

            var bytes = File.ReadAllBytes(fullPath);
            await WriteHttpResponseAsync(stream, 200, "OK", bytes, GetContentType(fullPath));
        }

        private async Task HandleWebSocketClientAsync(TcpClient tcpClient, NetworkStream stream, HttpRequest request)
        {
            string key;
            if (!request.Headers.TryGetValue("Sec-WebSocket-Key", out key) || string.IsNullOrWhiteSpace(key))
            {
                await WriteHttpResponseAsync(stream, 400, "Bad Request", Encoding.UTF8.GetBytes("Missing websocket key"), "text/plain; charset=utf-8");
                tcpClient.Close();
                return;
            }

            var acceptKey = CreateWebSocketAccept(key);
            var response = string.Format(
                "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: {0}\r\n\r\n",
                acceptKey
            );
            var responseBytes = Encoding.ASCII.GetBytes(response);
            await stream.WriteAsync(responseBytes, 0, responseBytes.Length, _cancellation.Token);

            var client = new SocketConnection(tcpClient, stream);
            lock (_sync)
            {
                _clients[client.Id] = client;
            }

            await SendAsync(client, new Dictionary<string, object>
            {
                { "type", "welcome" },
                { "message", "Verbunden. Erstelle einen Raum oder tritt einem bei." },
                { "playerName", client.DisplayName }
            });

            try
            {
                await ReceiveLoopAsync(client);
            }
            catch
            {
            }

            await RemoveClientAsync(client);
        }
        private async Task ReceiveLoopAsync(SocketConnection client)
        {
            while (!_cancellation.IsCancellationRequested && client.TcpClient.Connected)
            {
                var frame = await ReadFrameAsync(client.Stream, _cancellation.Token);
                if (frame == null)
                {
                    break;
                }

                if (frame.Opcode == 8)
                {
                    break;
                }

                if (frame.Opcode == 9)
                {
                    await SendFrameAsync(client, 10, frame.Payload);
                    continue;
                }

                if (frame.Opcode != 1)
                {
                    continue;
                }

                var payload = DeserializeMessage(Encoding.UTF8.GetString(frame.Payload));
                if (payload == null)
                {
                    await SendErrorAsync(client, "Nachricht konnte nicht gelesen werden.");
                    continue;
                }

                await HandleClientMessageAsync(client, payload);
            }
        }

        private async Task HandleClientMessageAsync(SocketConnection client, IDictionary<string, object> payload)
        {
            var type = GetString(payload, "type");
            if (string.IsNullOrWhiteSpace(type))
            {
                await SendErrorAsync(client, "Nachricht ohne Typ empfangen.");
                return;
            }

            if (type == "set_name")
            {
                await UpdatePlayerNameAsync(client, GetString(payload, "playerName"), true);
                return;
            }

            if (type == "create_room")
            {
                await CreateRoomAsync(client, GetString(payload, "playerName"));
                return;
            }

            if (type == "join_room")
            {
                await JoinRoomAsync(client, GetString(payload, "roomCode"), GetString(payload, "playerName"));
                return;
            }

            if (type == "leave_room")
            {
                await LeaveRoomAsync(client, true);
                return;
            }

            if (type == "paddle")
            {
                await UpdatePaddleAsync(client, GetDouble(payload, "y"));
                return;
            }

            if (type == "reset_match")
            {
                await ResetMatchAsync(client);
                return;
            }

            if (type == "ping")
            {
                await SendAsync(client, new Dictionary<string, object> { { "type", "pong" } });
                return;
            }

            await SendErrorAsync(client, "Unbekannter Nachrichtentyp.");
        }

        private async Task<HttpRequest> ReadHttpRequestAsync(NetworkStream stream, CancellationToken cancellationToken)
        {
            var buffer = new byte[1024];
            using (var memory = new MemoryStream())
            {
                while (memory.Length < 65536)
                {
                    var read = await stream.ReadAsync(buffer, 0, buffer.Length, cancellationToken);
                    if (read <= 0)
                    {
                        return null;
                    }

                    memory.Write(buffer, 0, read);
                    var headerText = Encoding.ASCII.GetString(memory.ToArray());
                    var endIndex = headerText.IndexOf("\r\n\r\n", StringComparison.Ordinal);
                    if (endIndex < 0)
                    {
                        continue;
                    }

                    var lines = headerText.Substring(0, endIndex).Split(new[] { "\r\n" }, StringSplitOptions.None);
                    if (lines.Length == 0)
                    {
                        return null;
                    }

                    var requestLine = lines[0].Split(' ');
                    if (requestLine.Length < 2)
                    {
                        return null;
                    }

                    var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    for (var index = 1; index < lines.Length; index++)
                    {
                        var separator = lines[index].IndexOf(':');
                        if (separator <= 0)
                        {
                            continue;
                        }

                        var key = lines[index].Substring(0, separator).Trim();
                        var value = lines[index].Substring(separator + 1).Trim();
                        headers[key] = value;
                    }

                    var requestPath = requestLine[1];
                    var queryIndex = requestPath.IndexOf('?');
                    if (queryIndex >= 0)
                    {
                        requestPath = requestPath.Substring(0, queryIndex);
                    }

                    return new HttpRequest
                    {
                        Method = requestLine[0],
                        Path = requestPath,
                        Headers = headers,
                    };
                }
            }

            return null;
        }

        private static bool IsWebSocketRequest(HttpRequest request)
        {
            if (request == null || !string.Equals(request.Path, "/ws", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            string upgrade;
            return request.Headers.TryGetValue("Upgrade", out upgrade) &&
                string.Equals(upgrade, "websocket", StringComparison.OrdinalIgnoreCase);
        }

        private async Task<WebSocketFrame> ReadFrameAsync(NetworkStream stream, CancellationToken cancellationToken)
        {
            var header = await ReadExactlyAsync(stream, 2, cancellationToken);
            if (header == null)
            {
                return null;
            }

            var opcode = header[0] & 0x0F;
            var isFinal = (header[0] & 0x80) != 0;
            var isMasked = (header[1] & 0x80) != 0;
            ulong payloadLength = (ulong)(header[1] & 0x7F);

            if (payloadLength == 126)
            {
                var extended = await ReadExactlyAsync(stream, 2, cancellationToken);
                if (extended == null)
                {
                    return null;
                }
                payloadLength = (ulong)((extended[0] << 8) | extended[1]);
            }
            else if (payloadLength == 127)
            {
                var extended = await ReadExactlyAsync(stream, 8, cancellationToken);
                if (extended == null)
                {
                    return null;
                }

                payloadLength = 0;
                for (var index = 0; index < 8; index++)
                {
                    payloadLength = (payloadLength << 8) | extended[index];
                }
            }

            byte[] mask = null;
            if (isMasked)
            {
                mask = await ReadExactlyAsync(stream, 4, cancellationToken);
                if (mask == null)
                {
                    return null;
                }
            }

            if (payloadLength > int.MaxValue)
            {
                return null;
            }

            var payload = payloadLength == 0
                ? new byte[0]
                : await ReadExactlyAsync(stream, (int)payloadLength, cancellationToken);
            if (payload == null)
            {
                return null;
            }

            if (isMasked)
            {
                for (var index = 0; index < payload.Length; index++)
                {
                    payload[index] = (byte)(payload[index] ^ mask[index % 4]);
                }
            }

            return new WebSocketFrame
            {
                Opcode = opcode,
                IsFinal = isFinal,
                Payload = payload,
            };
        }

        private static async Task<byte[]> ReadExactlyAsync(NetworkStream stream, int length, CancellationToken cancellationToken)
        {
            var buffer = new byte[length];
            var offset = 0;
            while (offset < length)
            {
                var read = await stream.ReadAsync(buffer, offset, length - offset, cancellationToken);
                if (read <= 0)
                {
                    return null;
                }

                offset += read;
            }

            return buffer;
        }

        private async Task WriteHttpResponseAsync(NetworkStream stream, int statusCode, string statusText, byte[] body, string contentType)
        {
            var header = string.Format(
                "HTTP/1.1 {0} {1}\r\nContent-Type: {2}\r\nContent-Length: {3}\r\nConnection: close\r\n\r\n",
                statusCode,
                statusText,
                contentType,
                body.Length
            );
            var headerBytes = Encoding.ASCII.GetBytes(header);
            await stream.WriteAsync(headerBytes, 0, headerBytes.Length, _cancellation.Token);
            await stream.WriteAsync(body, 0, body.Length, _cancellation.Token);
        }

        private async Task SendFrameAsync(SocketConnection client, int opcode, byte[] payload)
        {
            if (client == null || client.Stream == null || !client.TcpClient.Connected)
            {
                return;
            }

            var header = new List<byte> { (byte)(0x80 | (opcode & 0x0F)) };
            if (payload.Length <= 125)
            {
                header.Add((byte)payload.Length);
            }
            else if (payload.Length <= ushort.MaxValue)
            {
                header.Add(126);
                header.Add((byte)((payload.Length >> 8) & 0xFF));
                header.Add((byte)(payload.Length & 0xFF));
            }
            else
            {
                header.Add(127);
                var lengthBytes = BitConverter.GetBytes((ulong)payload.Length);
                if (BitConverter.IsLittleEndian)
                {
                    Array.Reverse(lengthBytes);
                }
                header.AddRange(lengthBytes);
            }

            var headerBytes = header.ToArray();
            await client.SendLock.WaitAsync();
            try
            {
                if (client.TcpClient.Connected)
                {
                    await client.Stream.WriteAsync(headerBytes, 0, headerBytes.Length, _cancellation.Token);
                    if (payload.Length > 0)
                    {
                        await client.Stream.WriteAsync(payload, 0, payload.Length, _cancellation.Token);
                    }
                }
            }
            catch
            {
            }
            finally
            {
                client.SendLock.Release();
            }
        }
        private async Task CreateRoomAsync(SocketConnection client, string playerName)
        {
            await LeaveRoomAsync(client, false);

            Room room;
            lock (_sync)
            {
                UpdateClientDisplayNameLocked(client, playerName);
                var roomCode = GenerateRoomCodeLocked();
                room = new Room(roomCode);
                room.LeftClient = client;
                client.Room = room;
                client.Role = "left";
                PrepareRoomLocked(room, true);
                room.Status = "Warte auf Spieler 2";
                room.Running = false;
                _rooms[roomCode] = room;
            }

            await BroadcastRoomStateAsync(room);
            await SendInfoAsync(client, string.Format("Raum {0} erstellt. Teile den Code mit einer anderen Person.", room.Code));
        }

        private async Task JoinRoomAsync(SocketConnection client, string roomCode, string playerName)
        {
            if (string.IsNullOrWhiteSpace(roomCode))
            {
                await SendErrorAsync(client, "Bitte einen Raumcode eingeben.");
                return;
            }

            roomCode = roomCode.Trim().ToUpperInvariant();
            await LeaveRoomAsync(client, false);

            Room room;
            lock (_sync)
            {
                UpdateClientDisplayNameLocked(client, playerName);
                if (!_rooms.TryGetValue(roomCode, out room))
                {
                    room = null;
                }
                else if (room.LeftClient != null && room.RightClient != null)
                {
                    room = null;
                }
                else
                {
                    if (room.LeftClient == null)
                    {
                        room.LeftClient = client;
                        client.Role = "left";
                    }
                    else
                    {
                        room.RightClient = client;
                        client.Role = "right";
                    }

                    client.Room = room;
                    PrepareRoomLocked(room, true);
                }
            }

            if (room == null)
            {
                await SendErrorAsync(client, "Raum nicht gefunden oder bereits voll.");
                return;
            }

            await BroadcastRoomStateAsync(room);
            await SendInfoAsync(client, string.Format("Du bist Raum {0} beigetreten.", room.Code));
        }

        private async Task UpdatePlayerNameAsync(SocketConnection client, string playerName, bool notifyClient)
        {
            Room roomToNotify;
            string appliedName;
            lock (_sync)
            {
                appliedName = UpdateClientDisplayNameLocked(client, playerName);
                roomToNotify = client.Room;
            }

            if (notifyClient)
            {
                await SendInfoAsync(client, string.Format("Dein Name ist jetzt {0}.", appliedName));
            }

            if (roomToNotify != null)
            {
                await BroadcastRoomStateAsync(roomToNotify);
            }
        }

        private async Task LeaveRoomAsync(SocketConnection client, bool notifyClient)
        {
            Room roomToNotify = null;
            var hadRoom = false;

            lock (_sync)
            {
                var room = client.Room;
                if (room == null)
                {
                    client.Role = null;
                    client.Room = null;
                }
                else
                {
                    hadRoom = true;
                    if (room.LeftClient == client)
                    {
                        room.LeftClient = null;
                    }
                    if (room.RightClient == client)
                    {
                        room.RightClient = null;
                    }

                    client.Role = null;
                    client.Room = null;

                    if (room.LeftClient == null && room.RightClient == null)
                    {
                        _rooms.Remove(room.Code);
                    }
                    else
                    {
                        room.Running = false;
                        room.Winner = null;
                        room.Status = "Warte auf Spieler 2";
                        room.LeftScore = 0;
                        room.RightScore = 0;
                        room.BallX = FieldWidth / 2.0;
                        room.BallY = FieldHeight / 2.0;
                        room.BallVelocityX = 0;
                        room.BallVelocityY = 0;
                        room.LeftY = (FieldHeight - PaddleHeight) / 2.0;
                        room.RightY = (FieldHeight - PaddleHeight) / 2.0;
                        roomToNotify = room;
                    }
                }
            }

            if (notifyClient && hadRoom)
            {
                await SendInfoAsync(client, "Raum verlassen.");
            }

            if (roomToNotify != null)
            {
                await BroadcastRoomStateAsync(roomToNotify);
            }
        }

        private Task UpdatePaddleAsync(SocketConnection client, double targetY)
        {
            if (double.IsNaN(targetY))
            {
                return Task.FromResult(0);
            }

            lock (_sync)
            {
                var room = client.Room;
                if (room == null || string.IsNullOrEmpty(client.Role))
                {
                    return Task.FromResult(0);
                }

                var clampedY = Clamp(targetY, 0, FieldHeight - PaddleHeight);
                if (client.Role == "left")
                {
                    room.LeftY = clampedY;
                }
                else if (client.Role == "right")
                {
                    room.RightY = clampedY;
                }
            }

            return Task.FromResult(0);
        }

        private async Task ResetMatchAsync(SocketConnection client)
        {
            Room room;
            lock (_sync)
            {
                room = client.Room;
                if (room == null)
                {
                    room = null;
                }
                else if (room.LeftClient == null || room.RightClient == null)
                {
                    room = null;
                }
                else
                {
                    PrepareRoomLocked(room, true);
                }
            }

            if (room == null)
            {
                await SendErrorAsync(client, "Fuer eine neue Runde muessen zwei Spieler im Raum sein.");
                return;
            }

            await BroadcastRoomStateAsync(room);
        }

        private async Task RemoveClientAsync(SocketConnection client)
        {
            await LeaveRoomAsync(client, false);

            lock (_sync)
            {
                _clients.Remove(client.Id);
            }

            await CloseConnectionAsync(client);
            client.SendLock.Dispose();
        }

        private void PrepareRoomLocked(Room room, bool resetScores)
        {
            room.LeftY = (FieldHeight - PaddleHeight) / 2.0;
            room.RightY = (FieldHeight - PaddleHeight) / 2.0;
            room.BallX = FieldWidth / 2.0;
            room.BallY = FieldHeight / 2.0;
            room.Winner = null;

            if (resetScores)
            {
                room.LeftScore = 0;
                room.RightScore = 0;
            }

            if (room.LeftClient != null && room.RightClient != null)
            {
                ResetBallLocked(room, _random.Next(0, 2) == 0 ? -1 : 1);
                room.Running = true;
                room.Status = "Match laeuft";
            }
            else
            {
                room.BallVelocityX = 0;
                room.BallVelocityY = 0;
                room.Running = false;
                room.Status = "Warte auf Spieler 2";
            }
        }

        private void ResetBallLocked(Room room, int direction)
        {
            room.BallX = FieldWidth / 2.0;
            room.BallY = FieldHeight / 2.0;
            room.BallVelocityX = InitialBallSpeed * direction;
            room.BallVelocityY = (_random.NextDouble() * 3.0 + 2.0) * (_random.Next(0, 2) == 0 ? -1 : 1);
        }

        private void UpdateRoomLocked(Room room)
        {
            if (room.LeftClient == null || room.RightClient == null)
            {
                room.Running = false;
                room.Winner = null;
                room.Status = "Warte auf Spieler 2";
                room.BallX = FieldWidth / 2.0;
                room.BallY = FieldHeight / 2.0;
                room.BallVelocityX = 0;
                room.BallVelocityY = 0;
                return;
            }

            if (!room.Running)
            {
                return;
            }

            room.BallX += room.BallVelocityX;
            room.BallY += room.BallVelocityY;

            if (room.BallY - BallRadius <= 0 || room.BallY + BallRadius >= FieldHeight)
            {
                room.BallVelocityY *= -1;
                room.BallY = Clamp(room.BallY, BallRadius, FieldHeight - BallRadius);
            }

            var leftPaddleX = 24.0;
            var rightPaddleX = FieldWidth - 24.0 - PaddleWidth;
            var hitsLeftPaddle =
                room.BallVelocityX < 0 &&
                room.BallX - BallRadius <= leftPaddleX + PaddleWidth &&
                room.BallY >= room.LeftY &&
                room.BallY <= room.LeftY + PaddleHeight;
            var hitsRightPaddle =
                room.BallVelocityX > 0 &&
                room.BallX + BallRadius >= rightPaddleX &&
                room.BallY >= room.RightY &&
                room.BallY <= room.RightY + PaddleHeight;

            if (hitsLeftPaddle)
            {
                var offset = (room.BallY - (room.LeftY + PaddleHeight / 2.0)) / (PaddleHeight / 2.0);
                room.BallVelocityX = Math.Abs(room.BallVelocityX);
                room.BallVelocityY = offset * 6.0;
                room.BallX = leftPaddleX + PaddleWidth + BallRadius;
            }

            if (hitsRightPaddle)
            {
                var offset = (room.BallY - (room.RightY + PaddleHeight / 2.0)) / (PaddleHeight / 2.0);
                room.BallVelocityX = -Math.Abs(room.BallVelocityX);
                room.BallVelocityY = offset * 6.0;
                room.BallX = rightPaddleX - BallRadius;
            }

            if (room.BallX < -BallRadius * 2)
            {
                AwardPointLocked(room, "right");
            }
            else if (room.BallX > FieldWidth + BallRadius * 2)
            {
                AwardPointLocked(room, "left");
            }
        }

        private void AwardPointLocked(Room room, string scorer)
        {
            if (scorer == "left")
            {
                room.LeftScore += 1;
            }
            else
            {
                room.RightScore += 1;
            }

            if (room.LeftScore >= MaxScore || room.RightScore >= MaxScore)
            {
                room.Running = false;
                room.Winner = scorer;
                room.Status = scorer == "left"
                    ? string.Format("{0} gewinnt", room.LeftClient != null ? room.LeftClient.DisplayName : "Spieler links")
                    : string.Format("{0} gewinnt", room.RightClient != null ? room.RightClient.DisplayName : "Spieler rechts");
                room.BallX = FieldWidth / 2.0;
                room.BallY = FieldHeight / 2.0;
                room.BallVelocityX = 0;
                room.BallVelocityY = 0;
                return;
            }

            ResetBallLocked(room, scorer == "left" ? 1 : -1);
            room.Status = "Match laeuft";
        }
        private async Task BroadcastRoomStateAsync(Room room)
        {
            RoomSnapshot snapshot;
            lock (_sync)
            {
                snapshot = CreateSnapshotLocked(room);
            }

            await BroadcastSnapshotAsync(snapshot);
        }

        private async Task BroadcastSnapshotAsync(RoomSnapshot snapshot)
        {
            var sends = new List<Task>(2);
            if (snapshot.LeftClient != null)
            {
                sends.Add(SendRoomStateAsync(snapshot.LeftClient, snapshot, "left"));
            }
            if (snapshot.RightClient != null)
            {
                sends.Add(SendRoomStateAsync(snapshot.RightClient, snapshot, "right"));
            }

            if (sends.Count > 0)
            {
                await Task.WhenAll(sends);
            }
        }

        private Task SendRoomStateAsync(SocketConnection client, RoomSnapshot snapshot, string role)
        {
            return SendAsync(client, new Dictionary<string, object>
            {
                { "type", "room_state" },
                { "roomCode", snapshot.Code },
                { "role", role },
                { "selfName", client.DisplayName },
                { "status", snapshot.Status },
                { "running", snapshot.Running },
                { "winner", snapshot.Winner },
                {
                    "players",
                    new Dictionary<string, object>
                    {
                        { "leftConnected", snapshot.LeftConnected },
                        { "rightConnected", snapshot.RightConnected },
                        { "leftName", snapshot.LeftName },
                        { "rightName", snapshot.RightName }
                    }
                },
                {
                    "scores",
                    new Dictionary<string, object>
                    {
                        { "left", snapshot.LeftScore },
                        { "right", snapshot.RightScore }
                    }
                },
                {
                    "paddles",
                    new Dictionary<string, object>
                    {
                        { "left", snapshot.LeftY },
                        { "right", snapshot.RightY }
                    }
                },
                {
                    "ball",
                    new Dictionary<string, object>
                    {
                        { "x", snapshot.BallX },
                        { "y", snapshot.BallY }
                    }
                }
            });
        }

        private RoomSnapshot CreateSnapshotLocked(Room room)
        {
            return new RoomSnapshot
            {
                Code = room.Code,
                LeftClient = room.LeftClient,
                RightClient = room.RightClient,
                LeftConnected = room.LeftClient != null,
                RightConnected = room.RightClient != null,
                LeftName = room.LeftClient != null ? room.LeftClient.DisplayName : string.Empty,
                RightName = room.RightClient != null ? room.RightClient.DisplayName : string.Empty,
                LeftY = room.LeftY,
                RightY = room.RightY,
                BallX = room.BallX,
                BallY = room.BallY,
                LeftScore = room.LeftScore,
                RightScore = room.RightScore,
                Running = room.Running,
                Status = room.Status,
                Winner = room.Winner,
            };
        }

        private async Task SendInfoAsync(SocketConnection client, string message)
        {
            await SendAsync(client, new Dictionary<string, object>
            {
                { "type", "info" },
                { "message", message }
            });
        }

        private async Task SendErrorAsync(SocketConnection client, string message)
        {
            await SendAsync(client, new Dictionary<string, object>
            {
                { "type", "error" },
                { "message", message }
            });
        }

        private async Task SendAsync(SocketConnection client, object payload)
        {
            if (client == null)
            {
                return;
            }

            var json = SerializeMessage(payload);
            await SendFrameAsync(client, 1, Encoding.UTF8.GetBytes(json));
        }

        private string SerializeMessage(object payload)
        {
            lock (_serializerSync)
            {
                return _serializer.Serialize(payload);
            }
        }

        private IDictionary<string, object> DeserializeMessage(string payload)
        {
            try
            {
                lock (_serializerSync)
                {
                    return _serializer.DeserializeObject(payload) as IDictionary<string, object>;
                }
            }
            catch
            {
                return null;
            }
        }

        private string CreateWebSocketAccept(string key)
        {
            using (var sha1 = SHA1.Create())
            {
                var combined = Encoding.ASCII.GetBytes(key.Trim() + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
                return Convert.ToBase64String(sha1.ComputeHash(combined));
            }
        }

        private string GetDisplayHost()
        {
            return _host == "+" || _host == "*" ? "localhost" : _host;
        }

        private static string GetString(IDictionary<string, object> payload, string key)
        {
            object value;
            if (payload == null || !payload.TryGetValue(key, out value) || value == null)
            {
                return null;
            }

            return Convert.ToString(value);
        }

        private static double GetDouble(IDictionary<string, object> payload, string key)
        {
            object value;
            if (payload == null || !payload.TryGetValue(key, out value) || value == null)
            {
                return double.NaN;
            }

            double parsed;
            return double.TryParse(Convert.ToString(value), out parsed) ? parsed : double.NaN;
        }

        private static double Clamp(double value, double min, double max)
        {
            return Math.Max(min, Math.Min(max, value));
        }

        private static IPAddress ResolveAddress(string host)
        {
            if (string.IsNullOrWhiteSpace(host) || host == "localhost")
            {
                return IPAddress.Loopback;
            }

            if (host == "+" || host == "*" || host == "0.0.0.0")
            {
                return IPAddress.Any;
            }

            IPAddress address;
            return IPAddress.TryParse(host, out address) ? address : IPAddress.Any;
        }

        private string GenerateRoomCodeLocked()
        {
            const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            for (var attempt = 0; attempt < 512; attempt++)
            {
                var codeBuilder = new StringBuilder(4);
                for (var index = 0; index < 4; index++)
                {
                    codeBuilder.Append(alphabet[_random.Next(alphabet.Length)]);
                }

                var code = codeBuilder.ToString();
                if (!_rooms.ContainsKey(code))
                {
                    return code;
                }
            }

            return Guid.NewGuid().ToString("N").Substring(0, 4).ToUpperInvariant();
        }

        private string UpdateClientDisplayNameLocked(SocketConnection client, string playerName)
        {
            if (client == null)
            {
                return string.Empty;
            }

            if (!string.IsNullOrWhiteSpace(playerName))
            {
                client.DisplayName = NormalizePlayerName(playerName);
            }
            else if (string.IsNullOrWhiteSpace(client.DisplayName))
            {
                client.DisplayName = string.Format("Gast {0}", client.Id.Substring(0, Math.Min(4, client.Id.Length)).ToUpperInvariant());
            }

            return client.DisplayName;
        }

        private static string NormalizePlayerName(string playerName)
        {
            if (string.IsNullOrWhiteSpace(playerName))
            {
                return string.Empty;
            }

            var builder = new StringBuilder();
            var previousWhitespace = false;
            foreach (var character in playerName.Trim())
            {
                if (char.IsControl(character))
                {
                    continue;
                }

                if (char.IsWhiteSpace(character))
                {
                    if (previousWhitespace || builder.Length == 0)
                    {
                        continue;
                    }

                    builder.Append(' ');
                    previousWhitespace = true;
                }
                else
                {
                    builder.Append(character);
                    previousWhitespace = false;
                }

                if (builder.Length >= 18)
                {
                    break;
                }
            }

            return builder.ToString().Trim();
        }

        private async Task CloseConnectionAsync(SocketConnection client)
        {
            if (client == null)
            {
                return;
            }

            try
            {
                if (client.Stream != null)
                {
                    client.Stream.Close();
                }
            }
            catch
            {
            }

            try
            {
                if (client.TcpClient != null)
                {
                    client.TcpClient.Close();
                }
            }
            catch
            {
            }

            await Task.FromResult(0);
        }

        private static string GetContentType(string path)
        {
            var extension = Path.GetExtension(path);
            if (string.Equals(extension, ".html", StringComparison.OrdinalIgnoreCase))
            {
                return "text/html; charset=utf-8";
            }
            if (string.Equals(extension, ".css", StringComparison.OrdinalIgnoreCase))
            {
                return "text/css; charset=utf-8";
            }
            if (string.Equals(extension, ".js", StringComparison.OrdinalIgnoreCase))
            {
                return "application/javascript; charset=utf-8";
            }
            if (string.Equals(extension, ".json", StringComparison.OrdinalIgnoreCase))
            {
                return "application/json; charset=utf-8";
            }
            if (string.Equals(extension, ".png", StringComparison.OrdinalIgnoreCase))
            {
                return "image/png";
            }
            if (string.Equals(extension, ".jpg", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(extension, ".jpeg", StringComparison.OrdinalIgnoreCase))
            {
                return "image/jpeg";
            }
            if (string.Equals(extension, ".svg", StringComparison.OrdinalIgnoreCase))
            {
                return "image/svg+xml";
            }

            return "application/octet-stream";
        }

        private sealed class SocketConnection
        {
            public SocketConnection(TcpClient tcpClient, NetworkStream stream)
            {
                TcpClient = tcpClient;
                Stream = stream;
                Id = Guid.NewGuid().ToString("N");
                DisplayName = string.Format("Gast {0}", Id.Substring(0, 4).ToUpperInvariant());
                SendLock = new SemaphoreSlim(1, 1);
            }

            public string Id { get; private set; }
            public TcpClient TcpClient { get; private set; }
            public NetworkStream Stream { get; private set; }
            public SemaphoreSlim SendLock { get; private set; }
            public Room Room { get; set; }
            public string Role { get; set; }
            public string DisplayName { get; set; }
        }

        private sealed class Room
        {
            public Room(string code)
            {
                Code = code;
                LeftY = (FieldHeight - PaddleHeight) / 2.0;
                RightY = (FieldHeight - PaddleHeight) / 2.0;
                BallX = FieldWidth / 2.0;
                BallY = FieldHeight / 2.0;
                Status = "Warte auf Spieler 2";
            }

            public string Code { get; private set; }
            public SocketConnection LeftClient { get; set; }
            public SocketConnection RightClient { get; set; }
            public double LeftY { get; set; }
            public double RightY { get; set; }
            public double BallX { get; set; }
            public double BallY { get; set; }
            public double BallVelocityX { get; set; }
            public double BallVelocityY { get; set; }
            public int LeftScore { get; set; }
            public int RightScore { get; set; }
            public bool Running { get; set; }
            public string Status { get; set; }
            public string Winner { get; set; }
        }

        private sealed class RoomSnapshot
        {
            public string Code { get; set; }
            public SocketConnection LeftClient { get; set; }
            public SocketConnection RightClient { get; set; }
            public bool LeftConnected { get; set; }
            public bool RightConnected { get; set; }
            public string LeftName { get; set; }
            public string RightName { get; set; }
            public double LeftY { get; set; }
            public double RightY { get; set; }
            public double BallX { get; set; }
            public double BallY { get; set; }
            public int LeftScore { get; set; }
            public int RightScore { get; set; }
            public bool Running { get; set; }
            public string Status { get; set; }
            public string Winner { get; set; }
        }

        private sealed class HttpRequest
        {
            public string Method { get; set; }
            public string Path { get; set; }
            public Dictionary<string, string> Headers { get; set; }
        }

        private sealed class WebSocketFrame
        {
            public int Opcode { get; set; }
            public bool IsFinal { get; set; }
            public byte[] Payload { get; set; }
        }
    }
}



