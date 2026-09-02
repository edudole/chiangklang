(()=>{'use strict';
const API='https://script.google.com/macros/s/AKfycbxwqpydnQSx2aPrQ8yJAN3P9Jkjic-8nNIlOHYFRyarrtTyb26sE_USzXNS7uk478wh8w/exec';
const builtins=[
  {id:'studentServicesBox',kind:'builtin',title:'บริการนักศึกษา',visible:true},
  {id:'userBox',kind:'builtin',title:'รายการ User',visible:true},
  {id:'learningSourceBox',kind:'builtin',title:'แหล่งเรียนรู้',visible:true},
  {id:'activityBox',kind:'builtin',title:'จดหมายข่าว',visible:true},
  {id:'FBpostBox',kind:'builtin',title:'Facebook',visible:true},
  {id:'cliproomBox',kind:'builtin',title:'หลักสูตรอบรมออนไลน์',visible:true},
  {id:'learningBaseModule',kind:'builtin',title:'ช้อปกิจกรรม',visible:true}
];
const builtinIds=new Set(builtins.map(x=>x.id));
let layout=builtins.map(x=>({...x})),saving=false,pendingSave=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||min));
function customId(){return 'custom-section-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
function normalizeItem(raw){
  const id=String(raw?.id||'').trim();
  const builtin=builtinIds.has(id);
  if(!id||(!builtin&&!/^custom-section-[a-z0-9-]+$/i.test(id)))return null;
  const base=builtin?builtins.find(x=>x.id===id):null;
  return {
    id,
    kind:builtin?'builtin':'custom',
    title:String(raw?.title||base?.title||'SECTION ใหม่').trim().slice(0,120)||'SECTION ใหม่',
    visible:raw?.visible!==false,
    sourceType:builtin?'':(String(raw?.sourceType||'url').toLowerCase()==='embed'?'embed':'url'),
    source:builtin?'':String(raw?.source||''),
    height:builtin?0:clamp(raw?.height||620,260,1600)
  };
}
function normalize(items){
  const incoming=Array.isArray(items)?items:[];
  const out=[],seen=new Set();
  incoming.forEach(raw=>{const item=normalizeItem(raw);if(item&&!seen.has(item.id)){seen.add(item.id);out.push(item)}});
  builtins.forEach(base=>{if(!seen.has(base.id))out.push({...base})});
  return out;
}
async function getLayout(){
  const r=await fetch(API+'?mode=sectionlayout&_t='+Date.now(),{cache:'no-store'}),j=await r.json();
  if(!r.ok||j.success===false)throw new Error(j.message||'โหลดการจัดเรียง Section ไม่สำเร็จ');
  return normalize(j.items);
}
async function saveLayout(){
  if(saving){pendingSave=true;return}
  saving=true;
  const snapshot=layout.map(x=>({...x}));
  status('กำลังบันทึก...');
  try{
    const token=sessionStorage.getItem('mysiteAdminToken')||'';
    const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({mode:'sectionlayoutadmin',action:'save',token,data:{items:snapshot}})}),j=await r.json();
    if(!r.ok||!j.success)throw new Error(j.message||'บันทึกไม่สำเร็จ');
    if(!pendingSave){layout=normalize(j.data?.items);renderCustomSections();apply();status('บันทึกแล้ว',900)}
  }catch(e){status('บันทึกไม่สำเร็จ: '+e.message,3200)}
  finally{saving=false;if(pendingSave){pendingSave=false;saveLayout()}}
}
function status(text,delay=0){
  let el=document.querySelector('.admin-section-save-status');
  if(!el){el=document.createElement('div');el.className='admin-section-save-status';document.body.appendChild(el)}
  el.textContent=text;el.hidden=false;clearTimeout(el._timer);if(delay)el._timer=setTimeout(()=>el.hidden=true,delay);
}
function renderCustomContent(section,item){
  section.innerHTML='';
  section.className='dynamic-section';
  section.dataset.dynamicSection='true';
  const wrap=document.createElement('div');wrap.className='dynamic-section-wrap';
  const heading=document.createElement('div');heading.className='dynamic-section-heading';
  const title=document.createElement('h2');title.textContent=item.title;heading.appendChild(title);wrap.appendChild(heading);
  const frameWrap=document.createElement('div');frameWrap.className='dynamic-section-frame-wrap';
  const frame=document.createElement('iframe');
  frame.className='dynamic-section-frame';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.style.height=item.height+'px';frame.title=item.title;
  frame.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; geolocation; gyroscope; picture-in-picture; web-share');
  if(item.sourceType==='embed'){
    frame.setAttribute('sandbox','allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads');
    frame.srcdoc=item.source||'<p style="font-family:sans-serif;padding:24px">ยังไม่มีโค้ดฝัง</p>';
  }else{
    frame.src=item.source||'about:blank';
  }
  frameWrap.appendChild(frame);
  if(item.sourceType==='url'&&item.source){
    const fallback=document.createElement('a');fallback.className='dynamic-section-open-page';fallback.href=item.source;fallback.target='_blank';fallback.rel='noopener noreferrer';fallback.textContent='เปิดหน้าเพจในแท็บใหม่';frameWrap.appendChild(fallback);
  }
  wrap.appendChild(frameWrap);section.appendChild(wrap);
}
function renderCustomSections(){
  const main=document.querySelector('main');if(!main)return;
  const wanted=new Set(layout.filter(x=>x.kind==='custom').map(x=>x.id));
  main.querySelectorAll('section[data-dynamic-section="true"]').forEach(el=>{if(!wanted.has(el.id))el.remove()});
  layout.filter(x=>x.kind==='custom').forEach(item=>{
    let section=document.getElementById(item.id);
    if(!section){section=document.createElement('section');section.id=item.id;main.appendChild(section)}
    renderCustomContent(section,item);
  });
}
function syncLinkedMenus(){
  layout.forEach(item=>{
    document.querySelectorAll(`a[href="#${CSS.escape(item.id)}"]`).forEach(link=>{link.hidden=item.visible===false;link.dataset.sectionVisibilityLinked='1'});
  });
}
function marker(item,index){
  const section=document.getElementById(item.id);if(!section)return;
  let box=section.querySelector(':scope > .admin-section-marker');
  if(!box){box=document.createElement('div');box.className='admin-section-marker';section.prepend(box)}
  const custom=item.kind==='custom';
  box.innerHTML=`<button class="admin-section-control admin-section-eye" type="button" title="${item.visible?'ปิดการมองเห็น':'เปิดการมองเห็น'}" aria-label="${item.visible?'ปิด':'เปิด'}การมองเห็น SECTION ${index+1}"><i class="fa-solid ${item.visible?'fa-eye':'fa-eye-slash'}"></i></button><span class="admin-section-marker-title">SECTION</span><strong class="admin-section-marker-number">${index+1}</strong><button class="admin-section-control admin-section-up" type="button" aria-label="เลื่อน SECTION ${index+1} ขึ้น" ${index===0?'disabled':''}><i class="fa-solid fa-arrow-up"></i></button><button class="admin-section-control admin-section-down" type="button" aria-label="เลื่อน SECTION ${index+1} ลง" ${index===layout.length-1?'disabled':''}><i class="fa-solid fa-arrow-down"></i></button>${custom?'<button class="admin-section-extra admin-section-edit" type="button"><i class="fa-solid fa-pen"></i> แก้ไข</button><button class="admin-section-extra admin-section-delete" type="button"><i class="fa-solid fa-trash"></i> ลบ</button>':''}`;
  box.querySelector('.admin-section-eye').onclick=e=>{e.stopPropagation();layout[index].visible=!layout[index].visible;apply();saveLayout()};
  box.querySelector('.admin-section-up').onclick=e=>{e.stopPropagation();if(index<1)return;[layout[index-1],layout[index]]=[layout[index],layout[index-1]];apply();saveLayout()};
  box.querySelector('.admin-section-down').onclick=e=>{e.stopPropagation();if(index>=layout.length-1)return;[layout[index],layout[index+1]]=[layout[index+1],layout[index]];apply();saveLayout()};
  box.querySelector('.admin-section-edit')?.addEventListener('click',e=>{e.stopPropagation();openSectionEditor(item,index)});
  box.querySelector('.admin-section-delete')?.addEventListener('click',e=>{e.stopPropagation();deleteCustomSection(item,index)});
  let msg=section.querySelector(':scope > .admin-section-hidden-message');
  if(!msg){msg=document.createElement('div');msg.className='admin-section-hidden-message';msg.textContent='section นี้ถูกปิดการมองเห็น';section.appendChild(msg)}
}
function apply(){
  const main=document.querySelector('main');if(!main)return;
  renderCustomSections();
  layout.forEach((item,index)=>{
    const section=document.getElementById(item.id);if(!section)return;
    main.appendChild(section);section.dataset.adminSection=String(index+1);section.dataset.sectionVisible=String(item.visible);marker(item,index);
  });
  syncLinkedMenus();
  document.dispatchEvent(new CustomEvent('site:section-layout-changed',{detail:{items:layout.map(x=>({...x}))}}));
}
function validPageUrl(value){
  const v=String(value||'').trim();
  if(!v||/^(?:javascript|data|vbscript):/i.test(v))return false;
  return /^(?:https?:\/\/|\/|\.\/|\.\.\/|[\w.-]+\.html(?:[?#].*)?$)/i.test(v);
}
function editorHtml(item){
  const type=item?.sourceType==='embed'?'embed':'url';
  return `<div class="dynamic-section-editor"><label>ชื่อ SECTION</label><input id="dynamicSectionTitle" class="swal2-input" value="${esc(item?.title||'')}" maxlength="120" placeholder="เช่น ห้องเรียนออนไลน์"><label>รูปแบบเนื้อหา</label><select id="dynamicSectionType" class="swal2-select"><option value="url" ${type==='url'?'selected':''}>URL หน้าเพจ (แสดงใน SECTION)</option><option value="embed" ${type==='embed'?'selected':''}>ฝังโค้ด HTML / iframe / embed</option></select><div id="dynamicSectionUrlWrap"><label>URL หน้าเพจ</label><input id="dynamicSectionUrl" class="swal2-input" value="${esc(type==='url'?(item?.source||''):'')}" placeholder="https://... หรือ page.html"></div><div id="dynamicSectionEmbedWrap"><label>โค้ดที่ต้องการฝัง</label><textarea id="dynamicSectionEmbed" class="swal2-textarea" placeholder="วาง iframe / HTML / embed code">${esc(type==='embed'?(item?.source||''):'')}</textarea><small>โค้ดฝังทำงานภายใน iframe แบบ sandbox เพื่อไม่ให้ชนกับระบบหลักของเว็บไซต์</small></div><label>ความสูง SECTION (px)</label><input id="dynamicSectionHeight" class="swal2-input" type="number" min="260" max="1600" step="10" value="${Number(item?.height||620)}"></div>`;
}
async function openSectionEditor(item,index){
  if(!window.Swal){status('ยังโหลดเครื่องมือแก้ไขไม่เสร็จ กรุณากดอีกครั้ง',1800);return}
  const editing=!!item;
  const result=await Swal.fire({title:editing?'แก้ไข SECTION':'เพิ่ม SECTION ใหม่',html:editorHtml(item),width:'min(820px,96vw)',showCancelButton:true,confirmButtonText:editing?'บันทึกการแก้ไข':'เพิ่ม SECTION',cancelButtonText:'ยกเลิก',confirmButtonColor:'#dc2626',didOpen:()=>{
    const type=document.getElementById('dynamicSectionType'),urlWrap=document.getElementById('dynamicSectionUrlWrap'),embedWrap=document.getElementById('dynamicSectionEmbedWrap');
    const sync=()=>{const isEmbed=type.value==='embed';urlWrap.hidden=isEmbed;embedWrap.hidden=!isEmbed};type.addEventListener('change',sync);sync();
  },preConfirm:()=>{
    const title=document.getElementById('dynamicSectionTitle').value.trim();
    const sourceType=document.getElementById('dynamicSectionType').value;
    const source=(sourceType==='embed'?document.getElementById('dynamicSectionEmbed').value:document.getElementById('dynamicSectionUrl').value).trim();
    const height=clamp(document.getElementById('dynamicSectionHeight').value,260,1600);
    if(!title)return Swal.showValidationMessage('กรุณาระบุชื่อ SECTION');
    if(!source)return Swal.showValidationMessage(sourceType==='embed'?'กรุณาวางโค้ดที่ต้องการฝัง':'กรุณาระบุ URL หน้าเพจ');
    if(source.length>45000)return Swal.showValidationMessage('โค้ด/URL ยาวเกิน 45,000 ตัวอักษร');
    if(sourceType==='url'&&!validPageUrl(source))return Swal.showValidationMessage('URL ไม่ถูกต้อง กรุณาใช้ https://... หรือชื่อไฟล์ เช่น page.html');
    return {title,sourceType,source,height};
  }});
  if(!result.isConfirmed)return;
  if(editing){layout[index]={...layout[index],...result.value}}
  else{layout.push({id:customId(),kind:'custom',visible:true,...result.value})}
  apply();await saveLayout();
}
async function deleteCustomSection(item,index){
  if(item.kind!=='custom')return;
  const result=await Swal.fire({icon:'warning',title:'ลบ SECTION นี้?',text:`${item.title} จะถูกนำออกจากหน้าเว็บไซต์`,showCancelButton:true,confirmButtonText:'ลบ SECTION',cancelButtonText:'ยกเลิก',confirmButtonColor:'#dc2626'});
  if(!result.isConfirmed)return;
  const section=document.getElementById(item.id);if(section)section.remove();layout.splice(index,1);apply();await saveLayout();
}
function addCreateButton(){
  if(document.getElementById('adminAddSectionButton'))return;
  const button=document.createElement('button');button.id='adminAddSectionButton';button.type='button';button.className='admin-add-section-button admin-only';button.innerHTML='<i class="fa-solid fa-plus"></i><span>เพิ่ม SECTION</span>';button.addEventListener('click',()=>openSectionEditor(null,-1));document.body.appendChild(button);
}
async function init(){addCreateButton();try{layout=await getLayout()}catch(e){console.warn(e);layout=normalize([])}renderCustomSections();apply()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
