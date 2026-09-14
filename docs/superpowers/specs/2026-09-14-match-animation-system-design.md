# 試合アニメーション基盤・サーブ安定化 設計

日付: 2026-09-14
対象: `volleyball_game`
ブランチ: `feat/match-animation-system-design`

## 1. 目的

Phase 1 の最優先事項を「1試合が見て分かり、操作して気持ちよく、15点まで安定して遊べること」に固定する。

育成、ガチャ、PvP、ランキング、追加キャラクターなどの周辺要素は、この試合コアが完成するまで追加しない。

今回の中心は以下の2点。

1. 現在の静止ポーズ差し替え型 `ToonPlayerProxy` を、共通骨格＋キャラクターパーツ＋連続モーション方式へ置き換える。
2. サーブを「固定初速」ではなく「狙った着地点へ到達する弾道逆算」に変更し、通常操作で安定して相手コートへ入るようにする。

## 2. 非目標

このフェーズでは以下を実装しない。

- キャラクター育成
- ガチャ
- PvP
- アカウント
- ランキング
- 追加学校・大量キャラクター
- 複雑なスキンシステム
- フル3D人物モデル
- モーションキャプチャ

まず KAI / REN / HINA と CPU 側3人で、1試合の品質を完成させる。

## 3. 採用方式

### 3.1 表現方式

採用案は「高品質2.5Dベクタースプライト＋関節アニメーション」。

Three.js の3Dコートは維持するが、人物は1枚の固定スプライトではなく、複数の2Dパーツを1体のリグとして構成する。

主なパーツ:

- head
- hairBack
- hairFront
- face
- neck
- torso
- upperArmL / upperArmR
- foreArmL / foreArmR
- handL / handR
- thighL / thighR
- shinL / shinR
- shoeL / shoeR
- optional accent parts

各パーツは親子関係を持つ。モーションはパーツの回転・位置・スケール・表示順を時間軸で補間して再生する。

これにより、キャラクターごとにモーションを作り直さず、同じモーションを別パーツへ適用できる。

### 3.2 共通リグ

全キャラクターは同じ論理骨格を使用する。

最低限のジョイント:

- root
- hips
- chest
- neck
- head
- shoulderL / shoulderR
- elbowL / elbowR
- wristL / wristR
- hipL / hipR
- kneeL / kneeR
- ankleL / ankleR

リグの座標は正規化し、キャラクターごとの体格は `CharacterVisualProfile` で補正する。

例:

```ts
interface CharacterVisualProfile {
  heightScale: number;
  shoulderScale: number;
  legScale: number;
  armScale: number;
  headScale: number;
  motionSpeed: number;
  approachStride: number;
  jumpVisualScale: number;
  landingWeight: number;
}
```

この値は見た目の差分であり、ゲーム内の実能力値とは直接結び付けない。ゲームバランスと見た目を分離する。

## 4. キャラクター資産

### 4.1 KAI を基準キャラクターにする

まず KAI 1体だけを完成品質まで作る。

KAI を通して以下を検証する。

- 頭身
- 遠目でのシルエット
- コート上でのサイズ感
- パーツの重なり
- 関節可動域
- アニメーション速度
- ボール接触タイミング
- 844x390 / 932x430 での視認性

KAI が完成してから REN / HINA に横展開する。

### 4.2 REN / HINA の差分

基本骨格・モーションは共通。

差分は主に以下。

- 髪型
- 顔
- 身長比
- 肩幅
- 手足比率
- ユニフォーム番号
- アクセント色
- モーション補正

REN:
- 安定感のある中間体格
- セット動作を滑らかに見せる
- 動作速度は標準

HINA:
- やや小柄
- 低い構え
- レシーブ・移動を軽快に見せる
- 接地時間を短めに見せる

KAI:
- エース寄り
- 助走幅を広く見せる
- 腕の振りを大きくする
- スパイクのインパクトを最も強く見せる

### 4.3 CPU 側

CPU 側3人も同じ骨格・共通モーションを使用する。

Phase 1 ではキャラクターごとの完全固有モーションは作らない。

CPU 側は髪型・体格・配色・番号の差分で識別できればよい。

## 5. 共通モーションライブラリ

### 5.1 必須モーション

試合完成に必要な共通モーションを以下に固定する。

1. `idle_ready`
2. `shuffle_left`
3. `shuffle_right`
4. `run_forward`
5. `run_back`
6. `receive_ready`
7. `receive_contact`
8. `receive_recover`
9. `set_enter`
10. `set_contact`
11. `set_recover`
12. `serve_ready`
13. `serve_toss`
14. `serve_swing`
15. `serve_followthrough`
16. `spike_approach_1`
17. `spike_approach_2`
18. `spike_plant`
19. `spike_takeoff`
20. `spike_airborne_cock`
21. `spike_contact`
22. `spike_followthrough`
23. `land`
24. `block_shuffle`
25. `block_takeoff`
26. `block_press`
27. `block_land`
28. `celebrate_short`
29. `frustrated_short`

実装内部では細分化されたクリップをステートマシンで連結する。

### 5.2 モーションステートマシン

描画側はゲームイベントを直接1枚絵へ変換しない。

ゲーム状態を `VisualIntent` に変換し、その意図をアニメーションステートへ渡す。

例:

```ts
type VisualIntent =
  | 'READY'
  | 'MOVE_LEFT'
  | 'MOVE_RIGHT'
  | 'RECEIVE'
  | 'SET'
  | 'SERVE'
  | 'SPIKE_APPROACH'
  | 'SPIKE_JUMP'
  | 'SPIKE_CONTACT'
  | 'BLOCK'
  | 'CELEBRATE';
```

ゲームロジックは描画フレームに依存しない。

描画はゲーム状態・イベントから意図を読み、遷移を補間する。

### 5.3 モーションの連続性

単純な瞬間切替を禁止する。

以下の遷移は必ずブレンドする。

- idle -> move
- move -> receive
- move -> approach
- approach -> takeoff
- airborne -> contact
- contact -> landing
- landing -> idle

ブレンド時間は基本 60〜140ms 程度とし、接触フレームだけはイベント時刻と一致させる。

## 6. ボール接触同期

ゲーム性と見た目のズレを避けるため、ボール接触は「アニメがそれっぽく見える時」ではなく、ゲームロジック側の実接触イベントを基準にする。

### 6.1 接触イベント

対象:

- SERVE
- RECEIVE
- SET
- SPIKE
- BLOCK

各イベントに `contactTime` またはそのフレームで再生すべき接触姿勢を描画側へ通知する。

### 6.2 表現

接触時のみ以下を許可する。

- 2〜4フレーム相当の軽いヒットストップ
- ボールトレイル強化
- インパクトリング
- 短いカメラFOV変化
- haptic

ただしカメラ位置を大きく切り替えず、プレイヤーがボール位置を見失わないことを優先する。

## 7. スパイク演出

スパイクは本ゲームの中心アクションとして最優先で作り込む。

### 7.1 視覚フロー

1. REN のトスが上がる
2. KAI が助走開始位置へ寄る
3. 3歩相当の助走
4. 両足踏切
5. 腕を後ろへ引く
6. 最高点付近で腕を振る
7. 実際のボール接触
8. 打球方向へフォロースルー
9. 着地

### 7.2 操作ガイド

常時UIで説明しない。

必要な瞬間だけ以下を出す。

- 助走中: 薄い進行ガイド
- 踏切可能: POWER を強調
- 空中接触可能: SPIKE 表示
- スワイプ方向: ライン / クロス / 強打の方向ヒント

ガイドはキャラクター・ボール・ネットを隠さない。

## 8. レシーブ・セットの視認性

### 8.1 所有者の明確化

誰がボールを取るか決まった時点で、その選手のみを軽く強調する。

- 足元リング
- 薄い着地点ライン
- 他選手は強調しない

現在の「複数人が同時に反応して見える」状態を避ける。

### 8.2 レシーブ

レシーブは接触前に必ず構えを見せる。

`receive_ready -> receive_contact -> receive_recover`

最低でも接触前120ms程度は低い構えを表示し、プレイヤーが何をしたか認識できるようにする。

### 8.3 セット

セッターはボール下へ入り、頭上で接触する。

ボールが手から離れた瞬間に次のスパイク助走へ視線が自然に移るよう、KAI の助走開始をセット完了直後に開始する。

## 9. ブロック

ブロックは以下の3段階を明確にする。

1. ネット際へ寄る
2. 相手のトス／スパイクに合わせて踏切
3. 両手をネット越しへ押し出す

ブロック接触判定は既存の実距離判定を維持し、アニメーションだけで遠隔ブロックに見えないようにする。

## 10. サーブ再設計

### 10.1 現状問題

現在は水平速度と固定の垂直速度を組み合わせているため、パワーや左右コースによってネット通過高度が不安定になる。

また既存テストは「SERVEイベントが発生した」「前方向速度を持った」ことを主に確認しており、最終的なネット越え・IN を保証していない。

### 10.2 新しい考え方

サーブは入力を以下へ変換する。

- `targetX`: 左右スワイプ
- `targetZ`: 基本は相手コート奥寄り
- `aggression`: 長押し時間

通常範囲では、指定着地点へ向かうために必要な初速を逆算する。

ネット上では最低安全高度を確保する。

目安:

- 通常サーブ安全クリアランス: ネット上端 + 0.35〜0.55m
- 強攻サーブ: +0.20〜0.35m

初心者向け通常サーブではネットミスを基本的に発生させない。

### 10.3 POWER の意味

POWER は「入るかどうか」ではなく次を変化させる。

- 球速
- 滞空時間
- 奥行き
- コース補正量
- 強攻時のリスク

通常操作:
- 高確率でIN

最大付近長押し＋ライン際狙い:
- 高速
- 受けづらい
- 少しアウトリスク

### 10.4 着地点プレビュー

サーブ準備時、相手コートへ薄い着地点マーカーを表示する。

- 左右スワイプでマーカー移動
- 長押しで奥行き／強攻具合を軽く可視化
- リリースで確定

マーカーは予測位置であり、CPU能力や微小なばらつきで若干ずれてもよい。

## 11. アーキテクチャ

新規描画責務を以下へ分離する。

### 11.1 `VisualRig`

- パーツ階層
- pivot
- transform
- draw order

### 11.2 `CharacterSkin`

- キャラクター固有パーツ
- 色
- 体格プロファイル

### 11.3 `MotionClip`

- キーフレーム
- duration
- easing
- contact marker

### 11.4 `MotionPlayer`

- クリップ再生
- 遷移
- blend
- playback speed

### 11.5 `PlayerVisualController`

- MatchState / ReworkEvent を VisualIntent へ変換
- 必要な MotionClip を選択
- キャラクター補正適用

### 11.6 `ServeTrajectorySolver`

- target
- aggression
- origin
- gravity
- net clearance

から初速を算出する純粋関数。

描画処理とゲームロジックを分離して単体テスト可能にする。

## 12. 資産フォーマット

初期段階では外部ランタイム依存を増やさない。

キャラクターパーツは SVG または透過PNGとして `public/assets/characters/<id>/` に配置する。

推奨:

```text
public/assets/characters/kai/
  head.svg
  face.svg
  hair-front.svg
  hair-back.svg
  torso.svg
  upper-arm-l.svg
  upper-arm-r.svg
  forearm-l.svg
  forearm-r.svg
  hand-l.svg
  hand-r.svg
  thigh-l.svg
  thigh-r.svg
  shin-l.svg
  shin-r.svg
  shoe-l.svg
  shoe-r.svg
```

Phase 1 ではランタイムでSVG DOMを操作せず、Three.js Texture / Sprite / Planeへロードする方式を基本とする。

## 13. パフォーマンス要件

対象端末はスマートフォン横持ち。

最低基準:

- 844x390
- 932x430
- DPR上限は現状同様 1.5 を基準
- 試合中の不要なテクスチャ生成を禁止
- モーション再生ごとのCanvas再生成を禁止
- KAI/REN/HINA/CPU3人の6体を同時描画して安定動作

各キャラのパーツテクスチャは起動時または試合開始時にキャッシュする。

## 14. テスト方針

### 14.1 サーブ

自動テストで以下を保証する。

- 左 / 中央 / 右
- 弱 / 中 / 強

最低9ケースを物理シミュレーションし、通常操作範囲では:

- ネットを越える
- 相手コート側へ着地する
- コート幅内へ入る

を確認する。

強攻ライン際のみ、仕様で許容したアウト領域を別テストに分ける。

### 14.2 モーション

ロジック単体テスト:

- 状態 -> VisualIntent
- VisualIntent -> MotionClip
- 接触イベント -> contact pose
- キャラ補正が共通モーションを壊さない

### 14.3 UI / E2E

Playwright で:

- 844x390
- 932x430

の両方を確認する。

最低シナリオ:

1. KAIサーブ
2. 相手レシーブ
3. 相手3タッチ攻撃
4. 自軍レシーブ
5. RENセット
6. KAI助走
7. KAIジャンプ
8. スパイク
9. 得点
10. 次ラリー

E2Eは「要素が存在する」だけでなく、ラリーが停止せず進行することを確認する。

## 15. 手動品質ゲート

実装完了扱いにする前に、実機または実機相当画面で以下を確認する。

- サーブが普通に入る
- サーブの狙いが理解できる
- 誰がボールを取るか分かる
- レシーブ動作が接触前に見える
- RENのセットが視覚的に分かる
- KAIの助走がスパイク前に見える
- ジャンプとスパイクが別動作として認識できる
- ブロックの踏切が分かる
- CPUも3タッチしているように見える
- ボールを見失わない
- 15点まで試合が破綻しない
- RESULT -> REMATCH が成立する

## 16. 実装順

設計上の推奨順は以下。

1. `ServeTrajectorySolver` とサーブIN保証テスト
2. 共通 `VisualRig` / `MotionClip` / `MotionPlayer`
3. KAI パーツ資産
4. KAI idle / move / receive
5. KAI serve
6. KAI spike approach / jump / contact / land
7. KAI block
8. REN / HINA へ共通モーション適用
9. CPU3人へ適用
10. 所有者・着地点・操作ガイド改善
11. 1試合通しE2E
12. 実機調整

サーブを最初に直す理由は、現在の試合開始直後の失敗要因を先に除去し、以降のモーション確認を安定したラリー上で行うため。

## 17. 完成条件

このフェーズは以下を全て満たして初めて完了とする。

- 通常サーブが安定してIN
- 6キャラが共通骨格で表示される
- 静止画の瞬間切替ではなく連続モーション
- レシーブ / セット / 助走 / ジャンプ / スパイク / ブロックの意味が目視で分かる
- ボール接触とアニメーション接触が同期
- 844x390 と 932x430 で操作UIが邪魔にならない
- CPUを含むラリーが安定
- 15点1セットを最後まで遊べる
- RESULT / REMATCH が維持される
- typecheck / unit+integration / production build / mobile E2E がGREEN

この条件を満たすまで、育成やPvPなど次フェーズの機能追加へ進まない。
