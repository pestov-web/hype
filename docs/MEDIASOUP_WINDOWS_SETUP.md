# mediasoup на Windows - Руководство по установке

## Проблема

mediasoup требует нативной компиляции C++ worker бинарника, который не предоставляется для Windows в готовом виде.

**Ошибка**:

```
Error: spawn mediasoup-worker ENOENT
```

## ✅ Решение 1: Visual Studio Build Tools (Рекомендуется для Windows)

### Шаг 1: Установить Visual Studio Build Tools

1. **Скачать** Build Tools:

    - https://visualstudio.microsoft.com/downloads/
    - Прокрутить вниз до "Tools for Visual Studio"
    - Скачать "Build Tools for Visual Studio 2022"

2. **Установить** с рабочей нагрузкой C++:

    ```
    ✅ Desktop development with C++
    ```

    Включает:

    - MSVC v143 - VS 2022 C++ x64/x86 build tools
    - Windows SDK
    - C++ CMake tools

3. **Размер**: ~7 GB дискового пространства

### Шаг 2: Установить Python 3.x

1. **Скачать** Python:

    - https://www.python.org/downloads/
    - Python 3.12.x (latest)

2. **Установить** с галочкой:

    ```
    ✅ Add Python to PATH
    ```

3. **Проверить**:
    ```bash
    python --version
    # Python 3.12.x
    ```

### Шаг 3: Пересобрать mediasoup

```bash
cd backend
pnpm rebuild mediasoup

# Или полная переустановка
pnpm remove mediasoup
pnpm add mediasoup@3
```

**Ожидаемый вывод**:

```
> mediasoup@3.19.4 install
> node npm-scripts.mjs postinstall

building mediasoup worker...
✅ mediasoup worker built successfully
```

### Шаг 4: Запустить backend

```bash
pnpm dev
```

**Ожидаемый вывод**:

```
🚀 Initializing SFU service...
Creating 4 mediasoup workers...
✅ Worker 0 created (PID: 12345)
✅ Worker 1 created (PID: 12346)
✅ Worker 2 created (PID: 12347)
✅ Worker 3 created (PID: 12348)
✅ SFU service initialized successfully
🚀 HTTP Server running on http://localhost:3001
🎙️ SFU Voice: http://localhost:3001/api/voice/health
```

---

## ✅ Решение 2: Docker (Проще, но медленнее)

Если не хочется устанавливать Build Tools (7 GB), можно использовать Docker:

### Создать Dockerfile

**backend/Dockerfile**:

```dockerfile
FROM node:20-bullseye

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source
COPY . .

# Build TypeScript
RUN pnpm build

# Expose ports
EXPOSE 3001
EXPOSE 40000-49999/udp

CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
    backend:
        build: ./backend
        ports:
            - '3001:3001'
            - '40000-49999:40000-49999/udp'
        environment:
            - NODE_ENV=development
            - SFU_ANNOUNCED_IP=127.0.0.1
            - DATABASE_URL=postgresql://user:password@db:5432/hype_db
        volumes:
            - ./backend:/app
            - /app/node_modules
        command: pnpm dev

    db:
        image: postgres:15
        environment:
            - POSTGRES_USER=user
            - POSTGRES_PASSWORD=password
            - POSTGRES_DB=hype_db
        ports:
            - '5435:5432'
```

### Запуск

```bash
docker-compose up -d
docker-compose logs -f backend
```

---

## ✅ Решение 3: WSL2 (Лучшее из обоих миров)

Использовать Windows Subsystem for Linux 2:

### Установить WSL2

```powershell
wsl --install
```

### В WSL2 терминале

```bash
# Установить Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установить pnpm
npm install -g pnpm

# Установить build tools
sudo apt-get install -y python3 make g++

# Клонировать проект
cd /mnt/c/Users/mwk/develop/hype/backend

# Установить зависимости
pnpm install

# Запустить
pnpm dev
```

---

## 🎯 Рекомендация

**Для разработки на Windows**:

1. ✅ **WSL2** - если уже установлен (быстро, удобно)
2. ✅ **VS Build Tools** - если планируете разработку C++/нативных модулей
3. ✅ **Docker** - если нужна изоляция и не хочется ставить Build Tools

**Для production**:

-   Всегда используйте Linux серверы (Ubuntu 22.04 LTS)

---

## 🧪 Проверка работы

После успешной установки:

```bash
# Health check
curl http://localhost:3001/api/voice/health

# Ожидаемый ответ
{
  "nodeId": "sfu-1",
  "region": "local",
  "workers": 4,
  "rooms": 0,
  "totalParticipants": 0,
  "status": "healthy"
}
```

---

## 📚 Дополнительные ресурсы

-   [mediasoup Installation Guide](https://mediasoup.org/documentation/v3/mediasoup/installation/)
-   [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
-   [WSL2 Documentation](https://learn.microsoft.com/en-us/windows/wsl/install)

---

## ⚠️ Текущий статус

-   ✅ Backend SFU код написан
-   ✅ API endpoints созданы
-   ✅ Routes интегрированы
-   ❌ mediasoup worker не скомпилирован
-   ⏳ **Ожидает**: Установка Build Tools или использование Docker/WSL2

**Следующий шаг**: Выберите решение 1, 2 или 3 и установите необходимые инструменты.
