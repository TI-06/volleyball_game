# Phase 1 Core Game Design

Date: 2026-09-14
Status: Design review
Repository: `TI-06/volleyball_game`
Target: Smartphone landscape Web app
Deployment: Cloudflare Workers Static Assets

## 1. Goal

Phase 1 の目的は、育成・ガチャ・オンライン対戦を入れる前に、CPU相手の3vs3バレーが「操作していて気持ちいい」「何度も再戦したくなる」状態を作ること。

プレイヤーは1人の選手だけを固定操作するのではなく、ラリーの状況に応じて3人を自動・手動で切り替えながら、レシーブ、トス、スパイク、ブロック、サーブを直接操作する。

ゲーム性の核は次の3点。

1. キャラ能力だけでなくプレイヤー操作で結果が変わる。
2. スマホで複雑になりすぎず、上達余地がある。
3. 少年スポーツアニメらしい熱量・表情・スピード感を、完全オリジナルキャラクターで表現する。

## 2. Phase 1 scope

### In scope

- スマホ横持ち
- 3vs3 CPU戦
- CPU難易度5段階
- 15点1セット制
- デュースあり、20点上限
- 仮想スティック移動
- 状況依存ACTION入力
- 自動・手動キャラ切替
- フローターサーブ
- ジャンプサーブ
- レシーブ
- ダイビングレシーブ
- トス
- スパイク
- フェイント
- ブロック
- 3段階カメラ
- 味方AI
- CPU攻撃AI
- 初回チュートリアル
- リザルト
- 難易度解放
- ローカル保存
- 初期6キャラクター
- WebGL/Three.jsによる3Dトゥーン表現
- Cloudflare公開

### Out of scope

- キャラ育成
- レベルアップ
- ガチャ
- 装備
- ストーリー
- 6vs6
- PvP
- アカウント認証
- サーバーDB
- 課金
- ランキング
- シーズン制
- スタミナ制

これらはPhase 1の操作感が完成してから追加する。

## 3. Product principles

### 3.1 操作優先

能力値は「自動成功率」ではなく、操作を助ける方向に効かせる。

例:

- レシーブ能力が高い -> 落下予測が早く正確、許容範囲が広い
- スパイク能力が高い -> 狙いのブレが小さく、Perfect受付時間が広い
- ブロック能力が高い -> 手の有効範囲が広い
- トス能力が高い -> アタッカーが合わせやすい軌道になる

能力90だから90%で成功、という抽選主体の設計にはしない。

### 3.2 CPUはズルをしない

CPUはユーザーの入力値を直接参照しない。

参照可能な情報:

- 選手位置
- ボール位置、速度、軌道
- ブロック位置
- 守備位置
- 過去の攻撃傾向
- ラリー状況

### 3.3 アニメ演出はプレイを邪魔しない

強い演出は以下だけに限定する。

- Perfect Spike
- Shut Out Block
- 長いラリーの決着
- Match Point決着

通常プレイでは短いテキスト・SE・軽い振動のみ。

## 4. Match rules

| Item | Rule |
| --- | --- |
| Team size | 3 vs 3 |
| Set | 1 set |
| Target score | 15 |
| Deuce | 14-14以降2点差 |
| Hard cap | 20 |
| Timeout | なし |
| Court change | なし |
| Rotation | Phase 1では簡略化 |
| Match target duration | 約3〜6分 |

20-19になった場合、20点上限により20点側の勝利とする。

## 5. Match flow

1. Title
2. CPU Match
3. Difficulty select
4. Team / character preview
5. Match
6. Result
7. Rematch / difficulty select / title

初回のみTutorialをMatch前に挟む。

## 6. Touch controls

### 6.1 Base layout

- 左側: フローティング仮想スティック
- 右側: 大型ACTION領域
- 下中央: 3人のキャラ切替カード
- 上中央: スコア
- 左上: 操作中キャラ名とポジションのみ

HP・スタミナゲージは表示しない。

### 6.2 Context ACTION

| Situation | ACTION |
| --- | --- |
| Serve | SERVE |
| Receive | RECEIVE |
| Emergency defense | DIVE |
| Setter control | SET / swipe mode |
| Approach | JUMP |
| Airborne attack | SPIKE |
| Net defense | BLOCK |

ACTIONは文字とアイコンの両方を表示する。

操作不可能なACTIONは表示しない。

### 6.3 UI opacity

- スティック待機: 20%
- スティック操作中: 65%
- ACTION待機: 35%
- ACTION受付中: 90%

スパイク時はキャラ切替UIなどを一時的に弱くし、相手コートの視認性を優先する。

## 7. Character switching

### 7.1 Default mode

Phase 1 の標準は `STANDARD`。

- CASUAL: 切替を強く自動化
- STANDARD: 自動候補 + プレイヤー入力優先
- MANUAL: 自動切替なし

### 7.2 AUTO ASSIST

ゲーム側が「次にボールへ関与する可能性が最も高い選手」を候補にする。

自動切替予定選手は約0.35秒前から外枠を発光させる。

次の条件では自動切替を遅延する。

- 現操作キャラに強い移動入力が継続している
- ジャンプ / スパイクなどキャンセル不能モーション中
- 手動切替予約が存在する

### 7.3 Manual switch

画面下の3人カードをタップすると切替。

キャンセル不能モーション中の場合は「予約切替」として、自然な復帰タイミングで切り替える。

### 7.4 Selection priority

#### Opponent serve

1. 予測落下地点に最も対応しやすい選手
2. レシーブ役割
3. 移動距離

#### Opponent attack

1. ネット前でブロック参加可能な選手
2. 後衛でボール到達予測地点に近い選手
3. カバー役

#### Own set

1. トス対象アタッカー
2. セッター
3. カバー役

## 8. Camera

### COURT CAM

通常ラリー。斜め後方から両チーム6人と主要なボール軌道が見える。

### PLAYER CAM

レシーブやトス時。操作キャラに少し寄りつつ、ボールと落下地点を同時に見せる。

### ACTION CAM

スパイク / 重要なブロック時。肩越し視点まで寄る。

完全な一人称にはしない。自キャラを画面内に残す。

カメラ遷移は原則0.2〜0.35秒程度で補間する。

設定で演出カメラを `STANDARD / LOW / OFF` にできる設計にする。

## 9. Serve mechanics

### Float serve

- 狙い位置をドラッグ
- ACTION長押しでパワー
- 離して打つ
- 低回転 + 小さな横揺れ
- 安全性が高い

### Jump serve

1. トス
2. 助走
3. JUMP
4. コース指定
5. インパクトで入力

- 高速
- トップスピン
- ネット越え後に沈む
- タイミングミスでネット / アウトあり

## 10. Receive mechanics

レシーブは `位置 + タイミング`。

画面上に落下予測サークルを表示し、到達が近づくほど収束する。

### Result

- PERFECT: セッター頭上付近へ強い補正
- GREAT: 攻撃可能な範囲へ返る
- GOOD: 攻撃可能だが乱れる
- BAD: ネット際 / 後方など大きく崩れる
- MISS: 失点

レシーブ能力が高いほど、予測表示開始が早く、予測誤差が小さく、Perfect受付が広い。

## 11. Dive mechanics

通常移動では間に合わないが救済可能な軌道のとき、ACTIONを `DIVE` に変更する。

- 成功するとボールを上げる
- 通常レシーブより精度は低い
- 実行後に短い復帰硬直がある
- 連続使用で守備が万能にならないようにする

## 12. Set mechanics

セッター操作時は右側の広い領域をスワイプ入力へ切り替える。

- フリック方向 = トス対象
- フリック速度 / 距離 = テンポと高さ

初期カテゴリ:

- Quick
- Normal
- High

Perfect Set時は、対象アタッカーのスパイクPerfect受付時間を拡大する。

## 13. Spike mechanics

スパイク結果は次の要素から決定する。

1. 助走位置
2. ジャンプタイミング
3. コース指定
4. インパクトタイミング
5. キャラ能力

### Attack inputs

- 強い前方向スワイプ: power hit
- 斜め: cross
- ライン方向: line
- 軽い入力: tip / feint
- ブロック外側を狙う入力: block-out attempt

### Timing multipliers

| Timing | Base power multiplier |
| --- | ---: |
| PERFECT | 1.00 |
| GREAT | 0.93 |
| GOOD | 0.82 |
| EARLY | 0.68 |
| LATE | 0.62 |

最終値はキャラ能力、打点、コース難度、ブロック接触によって補正する。

## 14. Block mechanics

ブロックは `位置 + ジャンプタイミング`。

- PERFECT: Shut Out候補
- GREAT: 強いワンタッチ
- GOOD: コース制限 / 弱いワンタッチ
- BAD: 抜かれる

ブロック能力は判定幅と手の有効範囲に作用する。

## 15. Ball simulation

完全な自由物理ではなく、ゲーム性を守るハイブリッド方式。

### Simulation inputs

- initial velocity
- gravity
- spin
- drag
- collision
- skill correction
- playable-zone correction

### Playable correction

入力が成立しているときだけ、ボールを「次のプレイが成立する範囲」へ限定的に補正する。

例:

- Perfect Receive -> セッター付近へ強く補正
- Good Receive -> 補正弱め
- Bad Receive -> ほぼ物理任せ

プレイヤーのミスを完全に無効化する補正は禁止。

## 16. Player movement simulation

各選手は最低限次のパラメータを持つ。

- maxSpeed
- acceleration
- deceleration
- turnRate
- jumpHeight
- jumpAcceleration

入力から最高速度まではおおむね0.15〜0.25秒で到達するレンジを基準とし、スマホ操作でモッサリしないことを優先する。

## 17. Ally AI

味方AIはボール追従型ではなく、役割State Machineと予測移動を使う。

### States

- RECEIVE
- SET
- APPROACH
- BLOCK
- COVER
- RECOVER

### Prediction

次の情報から0.2〜1.0秒先の到達候補を計算する。

- ball position
- ball velocity
- height
- opponent pose / attack phase
- own role

能力が低いAIでも「意味不明な方向へ走る」のではなく、予測地点の誤差や反応時間が悪化する設計とする。

## 18. CPU difficulty

CPUレベルとキャラ能力は別管理する。

同じキャラでもCPUレベルにより判断品質が変わる。

| Parameter | Beginner | Normal | Hard | Expert | Master |
| --- | ---: | ---: | ---: | ---: | ---: |
| Decision delay | 550-800ms | 350-550ms | 220-400ms | 130-260ms | 80-170ms |
| Ball prediction accuracy | 60% | 72% | 84% | 92% | 97% |
| Course variation | Low | Low-Mid | Mid | High | High |
| Feint frequency | 2% | 7% | 12% | 18% | 22% |
| Block read quality | Poor | Basic | Good | Very good | Excellent |
| Defense adaptation | None | Minimal | Basic | Strong | Strong + history |
| Player tendency history | 0 rallies | 1 | 3 | 5 | 8 |
| Intentional human-like error | High | Medium-high | Medium | Low | Low |

数値は初期チューニング値であり、プレイテストで調整可能なデータとして保持する。

### CPU behavior by level

#### Beginner

- オープン中心
- 正面寄り攻撃
- 遅めのブロック
- ミスを多めに許容

#### Normal

- cross / lineを使用
- 基本守備配置
- 稀にフェイント

#### Hard

- ブロック位置を見る
- 守備の空きを狙う
- 速攻を使用
- 直近傾向を軽く学習

#### Expert

- 守備位置とブロックを組み合わせて判断
- フェイントを適切に使用
- サーブで弱いレシーバーを狙う

#### Master

- 過去数ラリーの傾向を利用
- 攻撃選択を分散
- 強打 / コース / フェイントの読み合い
- ただしユーザー入力の直接参照は禁止

## 19. Initial characters

初期6キャラは2チーム分。名前や外見は仮称として扱うが、役割と操作感はPhase 1で固定する。

能力値は0〜100。

### Player team

#### KAI - Ace / Power

| Stat | Value |
| --- | ---: |
| Power | 92 |
| Speed | 76 |
| Jump | 88 |
| Spike | 88 |
| Receive | 62 |
| Set | 52 |
| Block | 72 |
| Read | 70 |

Trait: `Heavy Finish`

Perfect Spike時の打球初速補正が高い。

#### REN - Setter / Technical

| Stat | Value |
| --- | ---: |
| Power | 61 |
| Speed | 82 |
| Jump | 74 |
| Spike | 70 |
| Receive | 78 |
| Set | 94 |
| Block | 64 |
| Read | 91 |

Trait: `Clean Connection`

Perfect Set時のアタッカーPerfect受付拡大量が大きい。

#### HINA - Libero / Speed

| Stat | Value |
| --- | ---: |
| Power | 48 |
| Speed | 95 |
| Jump | 70 |
| Spike | 55 |
| Receive | 96 |
| Set | 76 |
| Block | 38 |
| Read | 90 |

Trait: `Never Down`

DIVE可能距離と復帰速度に優れる。

### Rival team

#### SHIN - Ace / Technical

| Stat | Value |
| --- | ---: |
| Power | 82 |
| Speed | 83 |
| Jump | 86 |
| Spike | 94 |
| Receive | 74 |
| Set | 62 |
| Block | 70 |
| Read | 88 |

Trait: `Tool the Block`

ブロックアウト狙いの精度が高い。

#### GOU - Middle / Block

| Stat | Value |
| --- | ---: |
| Power | 88 |
| Speed | 66 |
| Jump | 92 |
| Spike | 83 |
| Receive | 52 |
| Set | 45 |
| Block | 97 |
| Read | 78 |

Trait: `Wall`

Perfect Block判定と手の有効範囲に優れる。

#### YU - Setter / Speed

| Stat | Value |
| --- | ---: |
| Power | 58 |
| Speed | 92 |
| Jump | 79 |
| Spike | 68 |
| Receive | 76 |
| Set | 91 |
| Block | 62 |
| Read | 92 |

Trait: `Fast Tempo`

Quick Setと速攻連携の準備時間が短い。

## 20. Character visual direction

- 7〜7.5頭身
- アニメ調
- スポーツ選手らしい体格
- ポジションごとにシルエット差
- 表情を大きく読める設計
- 髪型は特徴的だが過度な非現実色は避ける
- ユニフォームはベース2色 + 差し色1色
- 主人公チーム基調は Navy / White / Teal
- 試合モデルは軽量な3Dトゥーン
- キャラ紹介や将来の演出では高密度2Dアートを併用可能

既存作品のキャラクター、制服、意匠、固有演出は複製せず、少年スポーツアニメの熱量を持つ完全オリジナルデザインとする。

## 21. Match presentation

### Standard point

- `POINT`
- score update
- short SE
- すぐ次ラリーへ

### Perfect Spike

- short camera emphasis
- `PERFECT SPIKE`
- speed display
- subtle screen shake / haptics

### Shut Out

- `SHUT OUT`
- blocker emphasis

### Match point

13点以降、接戦時にBGMと表情を少し強める。

能力補正は行わず、演出だけ変える。

## 22. Tutorial

初回チュートリアルは1ラリーを分解して学ばせる。

1. 移動
2. 落下地点へ入る
3. RECEIVE
4. セッターへ自動切替
5. アタッカーへフリックしてSET
6. アタッカーへ切替
7. JUMP
8. 相手コートを狙う
9. SPIKE
10. 次の守備でBLOCKまたはRECEIVE

説明はプレイを止めすぎず、最初の成功体験を優先する。

## 23. Result screen

表示項目:

- Win / Lose
- final score
- Best Spike speed
- Perfect Receive count
- Perfect Set count
- Perfect Spike count
- Block count
- longest rally

Phase 1では報酬・経験値は付与しない。

## 24. Difficulty unlock

初期解放:

- Beginner
- Normal
- Hard

Hard勝利でExpert解放。

Expert勝利でMaster解放。

保存:

- unlocked difficulty
- best score by difficulty
- best spike speed
- selected control mode
- camera setting
- tutorial completed

保存先はlocalStorage。

## 25. Technical architecture

### Frontend

- React
- TypeScript
- Vite

Reactはメニュー、HUD、設定、画面遷移を担当する。

### 3D rendering

- Three.js
- glTF / GLB assets
- `GLTFLoader`
- `AnimationMixer`

Three.jsは描画・アニメーションを担当し、ゲームルールの正本にはしない。

### Game simulation

独立したTypeScript層を持つ。

Responsibilities:

- match state
- rally state
- ball simulation
- player simulation
- collision intent
- input interpretation
- character switching
- ally AI
- CPU AI
- score
- camera intent

RendererはSimulation Stateを読むだけにし、Three.jsオブジェクトそのものをゲーム状態として扱わない。

### State update

ゲームロジックは固定タイムステップを使用する。

初期値は60Hz相当を基準とし、描画フレームレートと分離する。

これにより、端末性能差でボール挙動やCPU判断が変化しにくい構成にする。

## 26. Repository architecture

```text
src/
  app/
    routes/
    App.tsx
  game/
    simulation/
      match/
      player/
      ball/
    input/
    ai/
    camera/
    render/
  characters/
  ui/
    hud/
    menu/
    tutorial/
public/
  assets/
    characters/
    animations/
    court/
    audio/
tests/
  unit/
  integration/
  e2e/
docs/
  superpowers/
    specs/
```

責務の大きい単一ファイルを作らず、simulation / renderer / UIを明確に分離する。

## 27. Cloudflare deployment

Phase 1は Cloudflare Workers Static Assets でSPAを配信する。

- Cloudflare Vite pluginを利用
- `wrangler.jsonc`
- SPA fallbackを有効化
- `npm run build`
- `npm run deploy`

Phase 1ではWorker APIを必須としない。

将来PvPを追加する場合は、Cloudflare Durable Objects + WebSocketを候補とする。Phase 1のゲームSimulationをクライアントUI・Rendererから分離しておくことで、将来的なauthoritative server化を可能にする。

## 28. Testing strategy

### Unit

- ball trajectory
- timing judgement
- score / deuce / hard cap
- character switching priority
- CPU difficulty configuration
- AI state transitions
- stat modifiers

### Integration

- serve -> receive -> set -> spike sequence
- opponent attack -> block / receive
- character switch during rally
- rally termination
- match finish
- localStorage persistence

### E2E

Playwrightでスマホ横画面を中心に確認する。

最低対象:

- iPhone相当 viewport
- Android相当 viewport

E2E:

1. title -> CPU match
2. difficulty selection
3. match start
4. touch control visibility
5. score progression
6. result
7. rematch
8. settings persistence

ゲーム内の物理結果をE2Eの実時間入力だけに依存させず、テスト用deterministic hookを用意する。

## 29. Performance targets

Phase 1の基準:

- ミドルクラスの近年スマホで通常ラリー60fps目標
- 維持困難な端末では30fpsへ落ちてもSimulation結果は変えない
- 初期表示で不要なキャラアセットを一括ロードしない
- GLB / texture / audioを必要単位で分割
- メモリリークを防ぐためThree.js resource disposeを明示する
- heavy post-processingはPhase 1では採用しない

具体的なasset容量上限は本番モデル作成時に実機計測して決定する。

## 30. Error handling

- WebGL初期化失敗 -> 対応端末案内画面
- model load失敗 -> fallback model + diagnostic message
- audio load失敗 -> 無音で試合継続
- localStorage unavailable -> セッション中のみ設定保持
- unexpected game state -> ラリーを安全に再セットできるrecover pathを用意

ゲーム中に白画面で停止する状態を許容しない。

## 31. Phase 1 acceptance criteria

Phase 1完了条件:

1. スマホ横持ちで3vs3 CPU戦を最後までプレイできる。
2. Beginner〜Masterの5段階がゲームデータとして実装される。
3. Hard -> Expert -> Masterの解放が保存される。
4. 自動・手動キャラ切替が成立する。
5. サーブ、レシーブ、トス、スパイク、ブロック、ダイブを直接操作できる。
6. 入力タイミングとキャラ能力の両方が結果へ影響する。
7. 味方AIが役割に沿って動き、3人全員がボールへ殺到しない。
8. CPUがユーザー入力を直接読まず、難易度ごとの判断差を持つ。
9. Court / Player / Action cameraが切り替わる。
10. 初回チュートリアルを完走できる。
11. リザルトとベスト記録が表示・保存される。
12. Unit / Integration / Mobile E2EがCIでGREENになる。
13. Cloudflare Workers Static Assetsへデプロイできる。
14. ゲームコアがキャラ育成・PvPを追加できる責務分離になっている。

## 32. Phase boundary

Phase 1でゲームの「操作して面白い」を検証する。

Phase 1完了後に初めて以下を設計する。

- キャラ成長
- 育成
- キャラ獲得
- チーム編成拡張
- 長期進行
- PvP

Phase 1の試合コアが面白くない状態で、育成やコンテンツ量によって補わない。
