(() => {
  'use strict';
  const API_URL='https://script.google.com/macros/s/AKfycbwNWHswYVm6hcJran7djOygoEckCC101qHU9dbSsHCmQWA8r2Sfsez3ZYgbz5BufoQnsw/exec';
  const text=value=>String(value??'').trim();

  function safeUrl(value){
    try{const url=new URL(text(value));return /^https?:$/i.test(url.protocol)?url.toString():'';}
    catch(_){return '';}
  }
  function setText(id,value){
    const element=document.getElementById(id),content=text(value);
    if(!element)return false;
    element.textContent=content;
    element.closest('[data-optional]')?.toggleAttribute('hidden',!content);
    return Boolean(content);
  }
  function setSocial(id,value){
    const element=document.getElementById(id),url=safeUrl(value);
    if(!element)return false;
    element.hidden=!url;
    if(url)element.href=url;else element.removeAttribute('href');
    return Boolean(url);
  }
  function renderVision(data){
    const root=document.getElementById('visionContent');
    const visible=[
      setText('visionText',data.vision),
      setText('identityText',data.identity),
      setText('missionText',data.mission)
    ].some(Boolean);
    if(!visible&&root)root.innerHTML='<div class="about-empty">ยังไม่มีข้อมูลสำหรับแสดง</div>';
  }
  function renderContact(data){
    const panel=document.getElementById('contactPanel');
    const visible=[
      setText('contactOrganization',data.organization),
      setText('contactAddress',data.address),
      setText('contactPhone',data.phone),
      setSocial('contactFacebook',data.facebook),
      setSocial('contactLine',data.line)
    ];
    const socials=document.getElementById('contactSocials');
    if(socials)socials.hidden=!(visible[3]||visible[4]);
    const coordinate=text(data.coordinate);
    const wrap=document.getElementById('contactMapWrap');
    const frame=document.getElementById('contactMap');
    const link=document.getElementById('contactMapLink');
    if(coordinate&&wrap&&frame&&link){
      const query=encodeURIComponent(coordinate);
      frame.src=`https://www.google.com/maps?q=${query}&z=14&output=embed`;
      link.href=`https://www.google.com/maps/search/?api=1&query=${query}`;
      wrap.hidden=false;
    }else if(wrap){wrap.hidden=true;}
    if(!visible.some(Boolean)&&!coordinate&&panel){
      panel.innerHTML='<div class="about-empty">ยังไม่มีข้อมูลสำหรับแสดง</div>';
    }
  }
  async function loadAboutPage(){
    const page=text(document.body.dataset.aboutPage).toLowerCase();
    const content=document.getElementById('aboutPageContent');
    try{
      const url=new URL(API_URL);
      url.searchParams.set('mode','aboutPages');
      url.searchParams.set('_t',Date.now());
      const response=await fetch(url.toString(),{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const result=await response.json();
      if(result.success===false)throw new Error(result.message||'โหลดข้อมูลไม่สำเร็จ');
      if(page==='vision')renderVision(result.vision||{});
      else if(page==='contact')renderContact(result.contact||{});
    }catch(error){
      console.error('loadAboutPage error:',error);
      if(content){content.className='about-error';content.textContent='ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง';}
    }
  }
  document.addEventListener('DOMContentLoaded',loadAboutPage);
})();
