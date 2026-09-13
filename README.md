# volleyball_game

スマホ横持ちで遊ぶ3vs3バレーアクションWebゲーム。

Phase 1では、CPU戦の操作感を完成させることを最優先にしています。育成、ガチャ、PvP、アカウント、ランキングはPhase 2以降です。

## Phase 1

- 3vs3 / 15点1セット
- CPU 5段階: BEGINNER / NORMAL / HARD / EXPERT / MASTER
- 左スティック + 状況依存ACTION
- 自動 + 手動キャラ切替
- サーブ / レシーブ / ダイブ / トス / スパイク / ブロック
- COURT / PLAYER / ACTION カメラ
- 味方AI / CPU AI
- 初回チュートリアル
- 難易度解放・ベスト記録のlocalStorage保存
- Three.jsによる3Dトゥーン表現
- Cloudflare Workers Static Assetsで公開

## Development

Node.js 22以上を使用します。

```bash
npm install
npm run dev
```

### Local verification

リモートCIより先に、ローカルで以下をすべて通します。

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Cloudflare

Cloudflare Vite plugin + Workers Static Assetsを使用します。`wrangler.jsonc`ではSPA fallbackを有効化しています。Vite plugin利用時はassetsの出力directoryを手書きせず、`vite build`が生成するWrangler出力設定を利用します。

Cloudflareへログイン済みの環境で:

```bash
npm run deploy
```

`npm run deploy` は `npm run build && wrangler deploy` を実行します。

## GitHub Actions / notification policy

Phase 1 foundationではGitHub Actionsを意図的に追加していません。開発初期の失敗ジョブによる通知メールを増やさないためです。

まずローカル検証を安定させ、その後必要になった場合のみ、PR単位で1本に集約したCIを追加します。定期実行・pushごとの大量workflow・重複workflowは作りません。

## Documents

- Design: `docs/superpowers/specs/2026-09-14-phase1-core-game-design.md`
- Implementation plan: `docs/superpowers/plans/2026-09-14-phase1-foundation.md`
