FROM mono:6.12 AS build
WORKDIR /src
COPY . .
RUN mcs \
    -out:RetroArcade.Server.exe \
    -r:System.dll \
    -r:System.Core.dll \
    -r:System.Net.Http.dll \
    -r:System.Web.dll \
    -r:System.Web.Extensions.dll \
    server.cs Program.cs

FROM mono:6.12
WORKDIR /app
COPY --from=build /src/RetroArcade.Server.exe ./RetroArcade.Server.exe
COPY index.html ./index.html
COPY styles.css ./styles.css
COPY app.js ./app.js
COPY snake.html ./snake.html
COPY pong.html ./pong.html
COPY memory.html ./memory.html
COPY README.md ./README.md
ENV HOST=0.0.0.0
ENV PORT=10000
EXPOSE 10000
CMD ["mono", "RetroArcade.Server.exe"]
