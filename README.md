# solbox_workshop_2026

Solbox workshop 2026 운영 도구 모노레포입니다.

## Apps

- `apps/team-picker`: 팀 배치 도구
- `apps/recreation-games`: 레크 게임 진행 콘솔과 참가자 화면

## 실행

```bash
git clone https://github.com/Solbox-TF/solbox_workshop_2026.git
cd solbox_workshop_2026

npm run start:team
npm run start:recreation
```

- 팀 배치 도구: http://localhost:1140
- 레크 게임: http://localhost:4173
- 배포된 팀 배치 도구: https://picker.ollida.kr
- 배포된 레크 게임: https://game.ollida.kr

## 배포

팀 배치 도구와 레크 게임은 SST `StaticSite`로 S3 + CloudFront에 배포한다.

```bash
AWS_PROFILE=<profile> npm run deploy:aws
```

배포 전 변경사항 확인:

```bash
AWS_PROFILE=<profile> npm run diff -- --stage production
```

> Node.js 18 이상 필요. 별도 패키지 설치 없이 바로 실행 가능하다.
