# Gameplay Rework 2.5D Design

Date: 2026-09-14  
Status: Written spec awaiting review  
Repository: `TI-06/volleyball_game`  
Branch: `feat/gameplay-rework-2-5d`  
Target: Smartphone landscape Web app

## 1. Why this rework exists

現在のPhase 1は、3人切替・360度移動・状況依存ACTION・動的カメラ・3Dキャラを同時に成立させようとしており、プレイヤーが「拾う・上げる・決める」というバレーのリズムより、操作キャラやボタン状態を追うことに注意を使ってしまう。

今回のReworkは、The Spike系の「1人に集中するバレー感」と、スマホ向けスポーツゲームの「タッチの瞬間に入力を集中させる設計」を参考にしつつ、既存資産を完全に捨てずに試合部分だけ作り直す。

目的は、見た目を派手にすることではなく、最初の1ラリーで「これはバレーを操作している」と感じられること。

## 2. Product principles

### 2.1 One focus player

試合中にユーザーが直接操作するのは1人だけとする。

- ラリー中の自動キャラ切替は廃止する。
- 手動キャラ切替カードも廃止する。
- 味方2人はAIが担当する。
- プレイヤーは自分の位置取り、受球、助走、ジャンプ、スパイク、ブロックに集中する。

最初のRework playable sliceでは `KAI` を固定操作キャラとする。`REN` と `HINA` は味方AI。操作感が成立した後に、REN/HINAを含むフォーカスキャラ選択を追加する。

### 2.2 Volleyball rhythm first

試合の中心体験は以下の循環。

1. 相手サーブ/攻撃を読む
2. RECEIVE
3. 味方AIがSET
4. 助走位置へ入る
5. JUMP
6. SPIKE
7. 相手攻撃ではBLOCKまたは後衛守備

ゲーム側はこの流れを常に画面と入力で分かりやすくする。

### 2.3 No camera cuts during normal rally

通常ラリー中にCOURT/PLAYER/ACTION CAMを切り替えない。

- 基本カメラは固定2.5D。
- 大技時も位置は変えず、軽いズーム・ヒットストップ・画面振動だけ。
- ボール、ネット、操作キャラ、主要ブロッカーを同時に見失わないことを優先する。

### 2.4 Controls must become muscle memory

右手ボタンは2系統に固定する。

- `A / PLAY`: RECEIVE / emergency SET / TIPなどボールタッチ系
- `B / POWER`: JUMP / SPIKE / BLOCK / SERVEなど強動作系

画面上のラベルは状況に応じて変えてよいが、指の位置と役割は変えない。

## 3. Scope

### In scope

- 3vs3 / 15点1セット / 20点ハードキャップは維持
- KAI 1人固定操作の最初のPlayable Slice
- REN/HINA味方AI
- SHIN/GOU/YU CPU
- 固定2.5Dカメラ
- 横方向1軸の直接移動
- 画面奥行き方向の自動ポジショニング補助
- 2ボタン入力
- RECEIVEタイミング
- AI SET
- JUMP + SPIKE swipe
- BLOCK hold/release
- FLOAT SERVE
- 落下/アプローチ/ブロック予測表示
- アニメ調2.5Dキャラクター表現の土台
- 既存の得点、能力値、難易度、記録、Cloudflare配信を再利用

### Deferred until the new core feels good

- REN/HINAを直接操作する役割別モード
- 試合中キャラ切替
- JUMP SERVE
- フェイントの細分化
- キャラ育成
- PvP
- 6vs6
- ガチャ/装備/ストーリー
- 最終版の高品質キャラアセット

## 4. Camera and court presentation

### 4.1 Camera

固定2.5Dのサイド寄りカメラ。

- ネットを画面中央近くに固定。
- homeは画面左寄り、awayは右寄りに見える構図。
- 完全な真横ではなく、少しだけ上と奥行きを見せる。
- 3D空間は維持するが、プレイヤーは2Dスポーツゲームのように状況を読める。

### 4.2 Movement axis

画面上の左右移動は、ゲーム座標上では「ネットへ近づく / 離れる」方向を主軸にする。

- ユーザー入力: court depth方向を1軸で直接制御。
- court width方向はゲーム側が70〜80%補助する。
- 受球時は予測落下レーンへ自動で少し寄る。
- 攻撃時は助走レーンへ自動で少し寄る。
- ユーザー入力は常に優先し、完全オートにはしない。

これにより360度スティック操作を廃止しつつ、位置取りの上達余地を残す。

### 4.3 Framing rules

ラリー中に必ず優先して画面へ入れるもの:

1. Ball
2. Net
3. Focus player
4. Current setter / attacker
5. Relevant blocker

大きなカメラ移動は禁止。画面外へ出そうな場合は軽いズームアウトだけ許可する。

## 5. Touch control layout

### Left side: movement strip

仮想スティックは廃止する。

- 左画面約40%を横ドラッグ領域にする。
- 指を左へ動かすと自陣後方へ、右へ動かすとネット方向へ移動。
- 指の初期位置はどこでもよい。
- 移動速度はドラッグ距離に応じて0〜100%。
- 画面上下方向のドラッグは無視する。

### Right side: two fixed action zones

右下にAとBを固定。

#### A / PLAY

- RECEIVE
- emergency SET
- TIP
- context-neutral ball touch

#### B / POWER

- SERVE
- JUMP
- SPIKE
- BLOCK

A/Bとも最低88px相当のタッチ領域を確保する。

## 6. Rally mechanics

### 6.1 Receive

ユーザーの守備対象になった場合、ゲーム側が落下地点へ70〜80%寄せる。

表示:

- ボール落下地点サークル
- 受球可能エリア
- 接触タイミングリング

入力:

- Aをボールが腕へ入るタイミングでタップ。

結果:

- PERFECT: RENのセット位置へ高精度
- GREAT: 攻撃継続しやすい
- GOOD: 崩れるが継続
- BAD: 乱れた返球
- MISS: 失点または相手チャンスボール

Receive能力は予測表示開始時間、予測半径、Perfect幅に作用する。

### 6.2 AI Set

KAI操作中は原則RENがSETする。

- KAIが1本目を取った場合、RENが二段トスへ入る。
- RENが1本目を取った場合、HINAが緊急二段トス。
- HINAが1本目ならRENがSET。

SET時はKAIのアプローチ位置を画面へ表示する。

- Quick / Normal / HighはAIが状況と難易度で選ぶ。
- 良いRECEIVEほど速い攻撃を選びやすい。
- Perfect SetはKAIのSpike timing windowを広げる。

### 6.3 Approach and jump

味方SET後、KAIにアプローチゾーンを表示する。

- ユーザーは左ドラッグでネット距離を合わせる。
- width方向はアシストで打点へ寄る。
- Bを押すとJUMP。

重要なのは「ボールに触る瞬間」ではなく「いつ飛ぶか」をプレイヤースキルにすること。

早すぎ・遅すぎのジャンプでは最高打点に合わない。

### 6.4 Spike

空中ではBゾーンをスワイプ入力へ変える。

- 長く速いスワイプ: POWER
- 左/右方向: target lane選択
- 短いスワイプ: TIP
- ブロッカー外側方向: BLOCK OUT attempt

相手コートには一瞬だけ3つの攻撃レーンを薄く表示する。

Spike結果は以下から決める。

- jump timing
- contact height
- swipe direction / speed
- Spike ability
- Set quality
- opponent block position

### 6.5 Block

相手SET中、ブロック対象アタッカーへ予測マーカーを出す。

操作:

- Bを押し続ける: block ready
- Bを離す: jump

空中BLOCK接触は自動判定する。2回目のBLOCKボタン入力は要求しない。

判定:

- PERFECT: Shut Out candidate
- GREAT: strong one-touch
- GOOD: soft touch / course restriction
- BAD: beaten

Block abilityはjump timing toleranceとhand reachへ作用する。

### 6.6 Serve

最初のRework sliceはFLOAT SERVEだけ。

- B長押しでトス/パワーゲージ開始
- 左右ドラッグで狙いレーンを選ぶ
- 離してサーブ

JUMP SERVEは新しいラリー操作が成立した後に追加する。

## 7. Teammate AI

味方AIは「ユーザーの代わりに勝手に全部決める」のではなく、ユーザーが次の見せ場へ入れるように動く。

### REN

- 2本目へ最優先
- KAIが良い位置に入ればQuick/Normal
- 崩れた場合High
- KAIが守備で遅れた場合はHINAへ逃がすことも可能

### HINA

- 後衛守備の広い範囲をカバー
- RENが1本目を取った時だけ緊急SET
- KAIが攻撃へ入った後のカバーを優先

AIはユーザー入力そのものを読まず、MatchStateだけを見る。

## 8. CPU AI

既存のBEGINNER / NORMAL / HARD / EXPERT / MASTERを維持する。

難易度差は以下に限定する。

- reaction delay
- prediction error
- block read
- serve targeting
- attack variation

CPUの能力値そのものを難易度で水増ししない。

新カメラ/新入力に合わせて、CPUも同じ2.5D空間のルールで動かす。

## 9. Character presentation

現在のprimitive 3D humanoidは最終表現として使わない。

### 9.1 Visual direction

- 2.5D toon / anime sports style
- 6.5〜7頭身
- 強いシルエット差
- 太めの輪郭
- 顔はスマホ画面でも読める大きさ
- 完全オリジナルデザイン

### 9.2 First implementation asset strategy

最初のReworkでは「球体・カプセル人形」ではなく、2.5D billboard/spriteまたは平面toon proxyを使う。

KAIだけでも最低以下のポーズを持つ。

- idle
- run
- receive
- jump
- spike
- block
- land
- celebrate

REN/HINA/CPUは最低限 idle / move / contact / jump の区別を持つ。

### 9.3 Character identity

KAI:
- 大きい踏み込み
- 深い腕引き
- 強い前傾
- 重いimpact VFX

REN:
- 軽いフットワーク
- 頭上SET
- 手首の返し

HINA:
- 低姿勢
- 細かいステップ
- 高速スライド

## 10. Feedback and game feel

通常ラリーではカメラを切らない。

重要接触だけ以下を許可する。

### PERFECT RECEIVE

- 40〜60msの軽いhit stop
- 小さいPERFECT文字
- clean SE

### PERFECT SPIKE

- 60ms前後のhit stop
- 3〜5%程度の一瞬のzoom
- very short camera shake
- ball trail
- speed text

### SHUT OUT

- 70ms前後のhit stop
- block impact flash
- heavy SE

演出は操作入力をブロックしない。

## 11. Architecture

既存Runtimeへさらに条件分岐を追加しない。

新しい試合部分を以下へ分離する。

```text
src/game/rework/
  ReworkRuntime.ts
  ReworkInput.ts
  FocusPlayerController.ts
  PositionAssist.ts
  RallyDirector.ts
  TeammateAI.ts
  ReworkEvents.ts

src/game/render/rework/
  ReworkScene.ts
  ReworkCamera.ts
  ReworkPlayerView.ts
  ReworkCourtView.ts
  RallyMarkers.ts

src/ui/rework/
  ReworkMatchHud.tsx
  MovementStrip.tsx
  PlayButton.tsx
  PowerButton.tsx
```

`MatchScreen.tsx`は新Rework runtimeのホストへ薄くする。

### Reuse unchanged where possible

- `core/scoring.ts`
- `core/constants.ts`
- `core/types.ts`（必要最小限の拡張のみ）
- `ball/ballPhysics.ts`
- `characters/roster.ts`
- abilities / traits
- difficulty profiles
- match seed
- persistence / records
- result screen
- Cloudflare config

### Legacy removal policy

最初は旧Runtimeを残して比較可能にする。

新Reworkのunit/integration/E2Eが通った後に、production importを完全にReworkへ切り替え、旧character switching / camera director / contextual one-button系を削除する。

## 12. State flow

新Runtimeは以下の高レベル状態を持つ。

```text
SERVE_READY
SERVE
DEFENSE_READ
RECEIVE_WINDOW
TEAM_TRANSITION
APPROACH
ATTACK_JUMP
ATTACK_CONTACT
BLOCK_READ
BLOCK_JUMP
POINT
MATCH_OVER
```

入力受付は状態ごとに限定する。

これにより現在の「同じACTIONボタンがフレームごとに別の意味へ変わる」構造を廃止する。

## 13. First implementation milestone

最初のPlayable Sliceは以下だけを完成条件にする。

1. KAI固定操作
2. fixed 2.5D camera
3. left horizontal movement strip
4. A RECEIVE
5. REN AI SET
6. B JUMP
7. airborne B swipe SPIKE
8. CPUが返球
9. 1ラリーが往復可能
10. 844x390 / 932x430で操作可能

このMilestoneでは以下を後回しにしてよい。

- BLOCK
- SERVE再設計
- full result polish
- selectable focus character
- final character art

まず「RECEIVE -> SET -> JUMP -> SPIKE」が気持ちいいことを優先する。

## 14. Success criteria

Rework playable sliceは以下を満たすまで旧UIを置き換えない。

- ラリー中に操作キャラが変わらない
- ラリー中にカメラ位置が切り替わらない
- 必須入力は右手2ゾーン以内
- RECEIVEは1タップ
- SPIKEはJUMP + 1 swipe
- 画面上にボール・ネット・KAIがほぼ常時見える
- 844x390で主要ボタンがsafe area内に収まる
- 932x430でもレイアウトが崩れない
- CPU入力はユーザーのraw touchを参照しない
- 旧得点ルール・保存・難易度解放が壊れない
- KAI/REN/HINAを一目で見分けられる

## 15. Testing strategy

### Unit

- Rework input interpretation
- movement assist
- receive timing
- approach/jump timing
- spike lane selection
- block timing
- AI set target
- state transition

### Integration

- RECEIVE -> AI SET -> JUMP -> SPIKE
- AI attack -> user receive
- point -> next rally
- full match -> result
- rematch keeps new seed

### E2E

- 844x390 landscape
- 932x430 landscape
- portrait pause
- no character switch UI
- movement strip works
- A/B buttons remain fixed
- first tutorial rally succeeds

## 16. Migration plan

### PR1: Rework foundation

- Rework state machine
- fixed camera
- movement strip
- 2-button HUD
- KAI focus controller
- basic render proxies

### PR2: Core rally

- RECEIVE timing
- REN AI SET
- approach marker
- JUMP
- SPIKE swipe
- CPU return rally

### PR3: Defense and feel

- BLOCK hold/release
- landing/approach/block markers
- hit stop / shake / trail
- character proxy motion upgrade

### PR4: Cutover

- tutorial rewrite
- result regression
- mobile E2E
- switch production MatchScreen to Rework
- delete obsolete character switching and dynamic camera code

## 17. Non-goals

このReworkで既存の全機能を同時に再実装しない。

特に、現在あるからという理由だけで以下を持ち込まない。

- 3人操作
- 3人切替カード
- 360度仮想スティック
- COURT/PLAYER/ACTIONカメラ切替
- 1個のcontext ACTIONへ全操作を詰める構造

ゲームの価値は機能数ではなく、1ラリーの気持ちよさで判断する。
