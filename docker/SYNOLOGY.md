# 시놀로지에서 EXIF Frame 실행하기

EXIF Frame은 **100% 클라이언트 처리** 앱입니다. 서버는 정적 파일(HTML/JS/CSS/WASM)만 전달하면 됩니다. 따라서 NAS에서 가볍게 셀프호스팅하기에 매우 적합합니다.

---

## 사전 준비

- DSM 7.2 이상
- 패키지 센터에서 **Container Manager** 설치 (구버전 NAS는 "Docker" 패키지)
- 약 200MB의 빈 공간 (이미지 빌드시 일시적으로 더 필요)

---

## 방법 A — Container Manager의 Project 기능 사용 (권장)

가장 깔끔하고 업데이트도 쉬운 방식입니다.

### 1. 소스 업로드

File Station에서 공유 폴더를 만들거나, 기존 `docker` 공유 폴더 안에 폴더를 만듭니다:

```
/volume1/docker/exif-frame/
```

이 저장소의 다음 파일/폴더를 모두 이 경로에 복사합니다:

```
exif-frame/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── docker/
│   └── nginx.conf
└── web/              ← 소스 코드 전체
```

> `mobile/` 폴더는 필요 없으니 업로드하지 않아도 됩니다 (.dockerignore에 이미 제외되어 있습니다).

### 2. 프로젝트 생성

1. **Container Manager** 실행
2. 왼쪽 메뉴에서 **프로젝트(Project)** → **생성(Create)**
3. 다음과 같이 입력:
   - **프로젝트 이름**: `exif-frame`
   - **경로**: `/volume1/docker/exif-frame`
   - **소스**: "Create docker-compose.yml" 또는 "Use existing docker-compose.yml" 선택
4. **다음** → 웹 포털 설정은 건너뛰어도 됩니다 → **완료**

### 3. 빌드 진행

처음 빌드는 **5~10분** 정도 걸립니다. (Node 의존성 설치 + Vite 빌드)
"Building..." 로그가 끝나고 컨테이너가 **녹색 상태**가 되면 성공입니다.

### 4. 접속

브라우저에서:

```
http://<NAS-내부IP>:8787
```

포트가 충돌하면 `docker-compose.yml`의 `"8787:80"`에서 왼쪽 숫자를 바꾸세요.

---

## 방법 B — SSH로 직접 실행

```bash
ssh admin@<NAS-IP>
cd /volume1/docker/exif-frame
sudo docker compose up -d --build
```

상태 확인:

```bash
sudo docker compose ps
sudo docker compose logs -f exif-frame
```

---

## 외부에서 접속하려면

### 옵션 1: 시놀로지 리버스 프록시 (가장 권장)

1. **제어판** → **로그인 포털** → **고급** → **역방향 프록시**
2. **생성** 클릭, 다음과 같이 설정:

| 항목 | 값 |
|---|---|
| 소스 프로토콜 | HTTPS |
| 소스 호스트 이름 | `exif.example.com` (본인 도메인) |
| 소스 포트 | 443 |
| 대상 프로토콜 | HTTP |
| 대상 호스트 이름 | `localhost` |
| 대상 포트 | 8787 |

3. **사용자 지정 헤더** 탭에서 **WebSocket 생성** 클릭 (있어도 손해 없음)
4. 시놀로지가 자동으로 발급한 Let's Encrypt 인증서를 연결

이러면 `https://exif.example.com`으로 안전하게 접근할 수 있습니다.

### 옵션 2: 그냥 LAN 내부에서만

라우터에서 포트 포워딩을 하지 마세요. 어차피 로컬에서만 쓰는 용도라면 외부 노출이 필요 없습니다.

---

## 업데이트하기

업스트림 저장소의 새 버전을 받아 적용하려면:

```bash
cd /volume1/docker/exif-frame
# web/ 폴더를 최신 소스로 교체
sudo docker compose build --no-cache
sudo docker compose up -d
```

또는 Container Manager에서:

1. 프로젝트 → **빌드(Build)** 클릭
2. **작업(Action)** → **다시 시작(Restart)**

---

## 트러블슈팅

**Q. 빌드 중 `npm ci`에서 메모리 부족 에러**

DS220+ 같은 저사양 NAS(2GB RAM)에서 발생합니다. 다음 중 하나로 해결:

- **방법 1**: 데스크톱/노트북에서 미리 빌드한 후 이미지만 NAS로 전송
  ```bash
  # PC에서
  docker build -t exif-frame:local .
  docker save exif-frame:local | gzip > exif-frame.tar.gz
  # NAS로 전송 후
  sudo docker load < exif-frame.tar.gz
  ```
  그 후 `docker-compose.yml`에서 `build:` 섹션을 제거하고 `image: exif-frame:local`만 남깁니다.

- **방법 2**: NAS의 메모리 압축/스왑을 일시적으로 늘립니다.

**Q. 포트 8787이 이미 사용 중**

`docker-compose.yml`에서 변경하거나 환경변수로:

```bash
EXIF_FRAME_PORT=9000 sudo docker compose up -d
```

**Q. 컨테이너가 unhealthy 상태**

```bash
sudo docker compose logs exif-frame
```

대부분 빌드는 됐지만 nginx 설정 문제입니다. `docker/nginx.conf`를 확인하세요.

**Q. 접속하면 흰 화면만 나옴**

브라우저 콘솔(F12) 열어서 404나 MIME type 에러가 있는지 확인. 보통 `try_files` 라우팅이나 base path 문제입니다.

---

## 운영 메모

- **리소스 사용량**: 거의 0. nginx가 정적 파일만 서빙하므로 평상시 RAM 약 5MB.
- **외부 통신**: 없음. 사용자 사진은 NAS에 전송되지 않고 사용자 브라우저에서만 처리됩니다.
- **로그**: 5MB × 3개로 제한했으니 디스크가 차지 않습니다.
- **자동 시작**: `restart: unless-stopped` 정책으로 NAS 재부팅 시 자동 기동됩니다.
