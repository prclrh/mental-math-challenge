/* 四则运算挑战 · 无头 DOM 冒烟测试（jsdom） */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const FILE = path.resolve(__dirname, '..', 'index.html');
const html = fs.readFileSync(FILE, 'utf8');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra ? '  → ' + extra : '')); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function () {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e && e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, d = w.document;
  const $ = id => d.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const enter = el => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const typeIn = (el, v) => { el.value = String(v); el.dispatchEvent(new w.Event('input', { bubbles: true })); };

  await sleep(50);
  console.log('\n【1】初始化与默认设置');
  ok(errors.length === 0, '页面加载无脚本报错', errors.join(' | '));
  ok(/标准/.test($('summary').textContent) && /100 题/.test($('summary').textContent) &&
     /03:00/.test($('summary').textContent) && /加减乘除/.test($('summary').textContent),
     '默认摘要 = 标准 · 100 以内 · 100 题 · 03:00 · 加减乘除', $('summary').textContent);
  ok($('btnStart').textContent === '开始挑战 · 100 题 / 03:00', '开始按钮显示题量与时长', $('btnStart').textContent);
  const activeDiff = [...$('diffChips').children].filter(n => n.className.includes('active')).map(n => n.textContent.slice(0, 2));
  ok(activeDiff.length === 1 && activeDiff[0] === '标准', '难度高亮唯一且为「标准」', activeDiff.join(','));

  console.log('\n【2】切换难度预设');
  click($('diffChips').children[0]);                     // 入门
  ok(/10 以内加减法/.test($('diffDesc').textContent), '入门说明文字更新', $('diffDesc').textContent);
  ok(/10 以内/.test($('summary').textContent), '摘要范围同步为 10 以内', $('summary').textContent);
  click($('diffChips').children[3]);                     // 挑战
  ok(/两步混合/.test($('diffDesc').textContent) && /\+ 混合/.test($('summary').textContent), '挑战模式含混合运算', $('summary').textContent);

  console.log('\n【3】高级自定义');
  click($('advToggle'));
  ok($('advPanel').className.includes('show'), '高级面板可展开');
  click(d.querySelector('[data-max="50"]'));
  ok(/自定义/.test($('summary').textContent) && /50 以内/.test($('summary').textContent), '改数字上限后切到「自定义 50 以内」', $('summary').textContent);
  click(d.querySelector('[data-op="sub"]'));            // 取消减法
  ok(!/减/.test($('summary').textContent), '取消勾选减法后摘要不再含「减」', $('summary').textContent);
  click(d.querySelector('[data-op="sub"]'));            // 恢复
  const ops = ['add', 'sub', 'mul'];
  ops.forEach(k => click(d.querySelector('[data-op="' + k + '"]')));   // 只留除法
  ok(/运算 除/.test($('diffDesc').textContent), '仅保留除法时说明正确', $('diffDesc').textContent);
  click(d.querySelector('[data-op="div"]'));            // 试图取消最后一种
  ok($('advTip').className.includes('show') && /至少保留一种/.test($('advTip').textContent), '禁止取消最后一种运算并提示', $('advTip').textContent);
  ok(/运算 除/.test($('diffDesc').textContent), '仍保留除法运算');
  click(d.querySelector('[data-op="add"]'));
  click(d.querySelector('[data-op="sub"]'));
  click(d.querySelector('[data-op="mul"]'));            // 恢复四则
  click(d.querySelector('[data-max="10"]'));
  click($('mixChip'));
  ok(/数字上限 ≥ 50/.test($('advTip').textContent), '上限过低时混合运算被拦下并提示', $('advTip').textContent);
  click(d.querySelector('[data-max="100"]'));
  click($('mixChip'));
  ok(/含两步混合/.test($('diffDesc').textContent), '上限 100 时混合运算可开启', $('diffDesc').textContent);
  click($('mixChip'));

  console.log('\n【4】题量 / 时长自定义与校验');
  click([...$('countChips').children].find(n => n.getAttribute('data-count') === '50'));
  ok(/50 题/.test($('summary').textContent), '预设题量 50 生效', $('summary').textContent);
  typeIn($('countCustom'), 8);
  ok(/8 题/.test($('summary').textContent) && $('countCustom').className.includes('on'), '自定义题量 8 生效并高亮', $('summary').textContent);
  typeIn($('countCustom'), 9999);
  ok($('countTip').className.includes('show'), '超范围题量给出提示', $('countTip').textContent);
  typeIn($('timeCustom'), 45);
  ok(/00:45/.test($('summary').textContent) && /00:45/.test($('timeHint').textContent), '自定义 45 秒生效并显示换算', $('summary').textContent);
  typeIn($('timeCustom'), 5);
  ok($('timeTip').className.includes('show'), '过短时长给出提示', $('timeTip').textContent);
  typeIn($('countCustom'), 6);
  typeIn($('timeCustom'), 60);
  ok($('btnStart').textContent === '开始挑战 · 6 题 / 01:00', '开始按钮随设置实时更新', $('btnStart').textContent);

  console.log('\n【5】答题流程');
  click($('btnStart'));
  ok(!$('startScreen').className.includes('show'), '设置层关闭，游戏开始');
  ok(!$('answerInput').disabled, '输入框可用');
  ok(/6 题/.test($('brandSub').textContent), '顶部显示本局设置', $('brandSub').textContent);
  ok($('qProgress').textContent === '0 / 6', '进度显示 0 / 6', $('qProgress').textContent);
  const q1 = $('qText').textContent;
  ok(/^(\d+) ([+\-×÷]) (\d+)( [+-] (\d+) [×÷] (\d+))?$/.test(q1), '第 1 题格式正确', q1);
  const answerOf = t => {
    const p = t.split(' ');
    if (p.length === 3) { const a = +p[0], b = +p[2]; return p[1] === '+' ? a + b : p[1] === '-' ? a - b : p[1] === '×' ? a * b : a / b; }
    const a = +p[0], b = +p[2], c = +p[4];
    return p[3] === '×' ? a + b * c : a * b - c;
  };
  typeIn($('answerInput'), answerOf(q1));
  enter($('answerInput'));
  ok(/答对了/.test($('fb').textContent), '答对反馈正确', $('fb').textContent);
  ok($('sDone').textContent === '1' && $('sOk').textContent === '1', '统计：已答 1 / 正确 1', $('sDone').textContent + ',' + $('sOk').textContent);
  await sleep(900);
  ok($('qProgress').textContent === '1 / 6', '答完自动切到下一题', $('qProgress').textContent);
  ok($('answerInput').value === '', '下一题输入框已清空');
  const q2 = $('qText').textContent;
  typeIn($('answerInput'), 999);
  enter($('answerInput'));
  ok(/答错了/.test($('fb').textContent) && $('fb').textContent.includes(String(answerOf(q2))), '答错反馈含正确答案', $('fb').textContent);
  ok($('sBad').textContent === '1' && $('sRate').textContent === '50%', '正确率实时更新为 50%', $('sRate').textContent);
  await sleep(1200);
  ok($('qProgress').textContent === '2 / 6', '答错后也自动进入下一题', $('qProgress').textContent);

  console.log('\n【6】回车在反馈期间可跳过等待');
  const noBefore = $('qNo').textContent;
  typeIn($('answerInput'), answerOf($('qText').textContent));
  enter($('answerInput'));
  ok($('qNo').textContent === noBefore, '提交瞬间仍停在本题显示反馈', $('qNo').textContent);
  ok($('qProgress').textContent === '3 / 6', '进度立即 +1', $('qProgress').textContent);
  enter($('answerInput'));
  ok($('qNo').textContent !== noBefore && /4 \/ 6/.test($('qNo').textContent), '反馈期间按回车立即跳下一题', $('qNo').textContent);
  ok($('sOk').textContent === '2' && $('sBad').textContent === '1', '回车跳过不会重复计数', $('sOk').textContent + '/' + $('sBad').textContent);

  console.log('\n【7】主动交卷与结算');
  w.confirm = () => true;
  click($('btnFinish'));
  ok($('endScreen').className.includes('show'), '结算层弹出');
  ok(/自定义/.test($('recap').textContent) && /6 题/.test($('recap').textContent) && /01:00/.test($('recap').textContent),
     '结算页回显本局设置', $('recap').textContent);
  ok($('rOk').textContent === '2' && /1/.test($('rBad').textContent), '答对 2 / 答错 1（含漏答标注）', $('rOk').textContent + ' | ' + $('rBad').textContent);
  ok($('rRate').textContent === '66.7%', '正确率 2/3 = 66.7%', $('rRate').textContent);
  ok(/漏答 3/.test($('rBad').textContent), '漏答题数已标注', $('rBad').textContent);
  const wrongs = d.querySelectorAll('.wrongs li');
  ok(wrongs.length === 1, '错题列表 1 条', String(wrongs.length));
  ok(/正确/.test(wrongs[0].textContent) && /999/.test(wrongs[0].textContent), '错题含我的答案与正确答案', wrongs[0].textContent);
  ok(wrongs[0].textContent.includes(String(answerOf(q2))), '错题记录正确答案与原题一致', wrongs[0].textContent + ' | ' + q2);

  console.log('\n【8】结算后返回设置 / 再来一局');
  click($('btnSettings'));
  ok($('startScreen').className.includes('show') && !$('endScreen').className.includes('show'), '「调整设置」回到设置面板');
  ok($('btnStart').textContent === '开始挑战 · 6 题 / 01:00', '设置被完整保留', $('btnStart').textContent);
  try { ok(!!w.localStorage.getItem('mathgame.setup.v1'), '设置已写入本地记忆'); } catch (e) { ok(false, '设置已写入本地记忆', e.message); }

  console.log('\n【9】时间到自动结算（虚拟时钟加速 1000 倍）');
  typeIn($('countCustom'), 100);
  typeIn($('timeCustom'), 30);
  const realNow = w.Date.now.bind(w.Date);
  w.Date.now = () => realNow() * 1000;                 // 时间流速 ×1000
  click($('btnStart'));
  ok(/100 题/.test($('brandSub').textContent) && /00:30/.test($('timeText').textContent), '开局计时器显示 00:30', $('timeText').textContent);
  await sleep(400);
  ok($('endScreen').className.includes('show'), '时间到自动结算');
  ok(/时间到/.test($('endTitle').textContent), '标题提示「时间到」', $('endTitle').textContent);
  ok($('rTime').textContent === '00:30', '用时记为该局时长 00:30', $('rTime').textContent);
  ok($('rRate').textContent === '0.0%', '未作答时正确率为 0.0%', $('rRate').textContent);
  w.Date.now = realNow;

  console.log('\n【10】再来一局');
  click($('btnRestart'));
  ok(!$('endScreen').className.includes('show') && $('qProgress').textContent === '0 / 100', '重新开局并重置进度', $('qProgress').textContent);
  ok($('sDone').textContent === '0' && $('sBad').textContent === '0', '统计已清零');

  console.log('\n运行期脚本错误：' + (errors.length ? errors.join(' | ') : '无'));
  console.log('\n结果：通过 ' + pass + ' 项，失败 ' + fail + ' 项');
  dom.window.close();
  process.exit(fail ? 1 : 0);
})();
