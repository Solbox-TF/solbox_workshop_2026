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

`main` 브랜치에 push하면 GitHub Actions가 production stage로 자동 배포한다.
수동 배포가 필요하면 GitHub Actions의 `Deploy` workflow에서 `Run workflow`를 실행한다.

GitHub 저장소 설정에 아래 값을 등록해야 한다.

- Secret `AWS_ROLE_ARN`: GitHub OIDC로 assume할 AWS IAM role ARN
- Variable `AWS_REGION`: `ap-northeast-2`

로컬에서 직접 배포:

```bash
AWS_PROFILE=<profile> npm run deploy:aws
```

배포 전 변경사항 확인:

```bash
AWS_PROFILE=<profile> npm run diff -- --stage production
```

> Node.js 18 이상 필요. 별도 패키지 설치 없이 바로 실행 가능하다.
