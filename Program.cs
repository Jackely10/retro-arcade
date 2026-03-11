using System;
using System.IO;

namespace RetroArcade
{
    public static class Program
    {
        public static int Main(string[] args)
        {
            var rootPath = AppDomain.CurrentDomain.BaseDirectory;
            if (string.IsNullOrWhiteSpace(rootPath))
            {
                rootPath = Directory.GetCurrentDirectory();
            }

            var host = GetHost();
            var port = GetPort();

            try
            {
                using (var server = new ArcadeServer(rootPath, host, port))
                {
                    server.RunAsync().GetAwaiter().GetResult();
                }

                return 0;
            }
            catch (Exception exception)
            {
                Console.Error.WriteLine("Retro Arcade Server konnte nicht gestartet werden.");
                Console.Error.WriteLine(exception);
                return 1;
            }
        }

        private static string GetHost()
        {
            var host = Environment.GetEnvironmentVariable("HOST");
            return string.IsNullOrWhiteSpace(host) ? "0.0.0.0" : host;
        }

        private static int GetPort()
        {
            var rawPort = Environment.GetEnvironmentVariable("PORT");
            int port;
            return int.TryParse(rawPort, out port) && port > 0 ? port : 8080;
        }
    }
}
