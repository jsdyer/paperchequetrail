import test from 'node:test';
import assert from 'node:assert/strict';
import {metric,format,monthsUntil,csvCell} from '../web/model.mjs';
const oas=[0,'2026-2027',7,7554966,712845399487,0,0,7382411,696240199416,0,0,172555,16605200071];
test('Published October 2026 row',()=>{
  assert.equal(metric(oas,'count'),172555);assert.equal(metric(oas,'amount'),166052000.71);
  assert.equal(format(metric(oas,'share'),'share'),'2.28%');assert.equal(format(metric(oas,'valueShare'),'valueShare'),'2.33%');
});
test('Zero, no row and zero denominator remain distinct',()=>{
  const row=Array(13).fill(0);assert.equal(metric(row,'count'),0);assert.equal(metric(row,'share'),null);assert.equal(metric(undefined,'amount'),null);
});
test('Historical cut-off and quoting',()=>{
  assert.deepEqual(monthsUntil(['2025-08','2025-09','2025-10'],'2025-09','1'),['2025-09']);
  assert.equal(csvCell('a"b'),'"a""b"');
});
