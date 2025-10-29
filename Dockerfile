# Etap 1: Budowanie aplikacji (w tym przypadku to tylko przygotowanie plików)
# Używamy lekkiego obrazu node, aby mieć dostęp do serwera deweloperskiego, jeśli będzie potrzebny
FROM node:18-alpine AS build

# Ustawienie katalogu roboczego w kontenerze
WORKDIR /app

# Kopiowanie wszystkich plików projektu do katalogu roboczego
# Zamiast `package.json`, kopiujemy kluczowe pliki, które definiują naszą aplikację
COPY index.html index.tsx metadata.json types.ts ./
COPY components/ ./components/
COPY services/ ./services/

# W przypadku prostej aplikacji statycznej bez kroku budowania (np. przez Vite/Webpack),
# ten etap głównie służy do zebrania plików. Jeśli w przyszłości dodasz
# narzędzia budujące, tutaj uruchomisz `npm install` i `npm run build`.


# Etap 2: Serwowanie plików statycznych za pomocą Nginx
# Używamy bardzo lekkiego i wydajnego serwera www Nginx
FROM nginx:1.25-alpine

# Kopiowanie zbudowanych/przygotowanych plików z etapu "build" do katalogu,
# z którego Nginx serwuje pliki.
# W naszym przypadku kopiujemy wszystko, co było w /app.
COPY --from=build /app /usr/share/nginx/html

# Informujemy Docker, że kontener będzie nasłuchiwał na porcie 80
EXPOSE 80

# Komenda, która uruchamia serwer Nginx, gdy kontener startuje
CMD ["nginx", "-g", "daemon off;"]
