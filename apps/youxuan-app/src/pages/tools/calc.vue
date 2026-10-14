<template>
  <view class="page">
    <view class="screen">
      <text class="expr">{{ expr || '0' }}</text>
      <text class="result">{{ result }}</text>
    </view>
    <view class="keys">
      <view v-for="(k, i) in keys" :key="i" class="key" :class="keyClass(k)" @tap="press(k)">{{ k }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const expr = ref('');
const result = ref('0');
/** 刚算完：此时再输入数字应重新开始，而不是拼到结果后面 */
let justEvaluated = false;

const keys = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='];

function keyClass(k: string) {
  if (k === '0') return 'zero';
  if ('÷×-+='.includes(k)) return 'op';
  if (k === 'C' || k === '⌫' || k === '%') return 'fn';
  return '';
}

function press(k: string) {
  if (k === 'C') {
    expr.value = '';
    result.value = '0';
    justEvaluated = false;
    return;
  }
  if (k === '⌫') {
    expr.value = expr.value.slice(0, -1);
    justEvaluated = false;
    return;
  }
  if (k === '=' || k === '%') {
    try {
      const v = evaluate(expr.value);
      const r = k === '%' ? v / 100 : v;
      result.value = String(r);
      expr.value = String(r);
      justEvaluated = true;
    } catch {
      result.value = '错误';
      justEvaluated = false;
    }
    return;
  }
  // 数字/小数点/运算符
  if (justEvaluated && (k === '.' || (k >= '0' && k <= '9'))) {
    expr.value = k === '.' ? '0.' : k;
  } else {
    expr.value += k;
  }
  justEvaluated = false;
}

/**
 * 四则运算求值：手写递归下降解析，不使用 Function/eval
 * —— App 内 WebView 常有 CSP 限制，new Function 会被拦截
 */
function evaluate(input: string): number {
  const s = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s/g, '');
  if (!s) throw new Error('empty');
  if (!/^[0-9+\-*/().]+$/.test(s)) throw new Error('bad char');

  let pos = 0;
  const peek = () => s[pos];

  function parseExpr(): number {
    let v = parseTerm();
    while (pos < s.length && (peek() === '+' || peek() === '-')) {
      const op = s[pos++];
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function parseTerm(): number {
    let v = parseFactor();
    while (pos < s.length && (peek() === '*' || peek() === '/')) {
      const op = s[pos++];
      const r = parseFactor();
      if (op === '*') v = v * r;
      else {
        if (r === 0) throw new Error('divide by zero');
        v = v / r;
      }
    }
    return v;
  }
  function parseFactor(): number {
    if (pos >= s.length) throw new Error('unexpected end');
    const ch = s[pos];
    if (ch === '+' || ch === '-') {
      pos++;
      const v = parseFactor();
      return ch === '-' ? -v : v;
    }
    if (ch === '(') {
      pos++;
      const v = parseExpr();
      if (s[pos] !== ')') throw new Error('missing )');
      pos++;
      return v;
    }
    if (ch === '.' || (ch >= '0' && ch <= '9')) {
      const start = pos;
      while (pos < s.length && ((s[pos] >= '0' && s[pos] <= '9') || s[pos] === '.')) pos++;
      const num = Number(s.slice(start, pos));
      if (Number.isNaN(num)) throw new Error('bad number');
      return num;
    }
    throw new Error('bad char');
  }

  const v = parseExpr();
  if (pos !== s.length) throw new Error('trailing input');
  if (!Number.isFinite(v)) throw new Error('not finite');
  return Math.round(v * 1e6) / 1e6;
}
</script>

<style scoped>
.page { padding: 24rpx; min-height: 100vh; }
.screen { background: #1c1c1e; border-radius: 20rpx; padding: 60rpx 32rpx; text-align: right; margin-bottom: 24rpx; }
.expr { color: rgba(255,255,255,.6); font-size: 36rpx; display: block; min-height: 48rpx; word-break: break-all; }
.result { color: #fff; font-size: 72rpx; font-weight: 300; display: block; margin-top: 16rpx; }
.keys { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.key { height: 120rpx; border-radius: 60rpx; background: #f2f3f5; font-size: 40rpx; color: #222; display: flex; align-items: center; justify-content: center; }
.key.zero { grid-column: span 2; border-radius: 60rpx; }
.key.op { background: #FF9F0A; color: #fff; }
.key.fn { background: #d4d4d2; color: #222; }
</style>