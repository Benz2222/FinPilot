FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json ./
COPY backend/src/FinPilot.Engine/FinPilot.Engine.csproj backend/src/FinPilot.Engine/
COPY backend/src/FinPilot.Api/FinPilot.Api.csproj backend/src/FinPilot.Api/
RUN dotnet restore backend/src/FinPilot.Api/FinPilot.Api.csproj
COPY backend/src/ backend/src/
RUN dotnet publish backend/src/FinPilot.Api/FinPilot.Api.csproj \
    --configuration Release --no-restore --output /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
ENV ASPNETCORE_ENVIRONMENT=Production
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "-c", "export ASPNETCORE_HTTP_PORTS=${PORT:-8080}; exec dotnet FinPilot.Api.dll"]
