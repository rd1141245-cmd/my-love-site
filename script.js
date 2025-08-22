/* ====== блокируем скролл до конца интро ====== */
document.body.classList.add('loading');

/* ================== FIREWORKS INTRO ================== */
const intro = document.getElementById('intro');
const canvas = document.getElementById('fireworks');
const ctx = canvas.getContext('2d');

// Создаём countdown, если его нет в DOM
let countdownEl = document.getElementById('countdown');
if (!countdownEl) {
  countdownEl = document.createElement('div');
  countdownEl.id = 'countdown';
  countdownEl.style.position = 'absolute';
  countdownEl.style.top = '40%';
  countdownEl.style.left = '50%';
  countdownEl.style.transform = 'translateX(-50%)';
  countdownEl.style.fontSize = '5em';
  countdownEl.style.fontWeight = 'bold';
  countdownEl.style.color = '#fff';
  countdownEl.style.textShadow = '0 0 20px rgba(255,255,255,.6)';
  countdownEl.style.opacity = '0';
  countdownEl.style.transition = 'opacity .4s ease, transform .4s ease';
  intro.appendChild(countdownEl);
}

function fitCanvas(){
  const rect = canvas.getBoundingClientRect();
  const dpr  = Math.max(1, window.devicePixelRatio || 1);
  canvas.width  = Math.max(1, Math.floor(rect.width  * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

const particles = [];
const GRAVITY = 0.08;
const COLORS = ['#ff7aa2','#ffd6e5','#ff97b7','#fff2f7','#ffc2d6'];

function spawnBurst(x, y, count=90, speed=3.9){
  for(let i=0;i<count;i++){
    const a = Math.random()*Math.PI*2;
    const s = speed * (0.6 + Math.random()*0.8);
    particles.push({
      x, y,
      vx: Math.cos(a)*s,
      vy: Math.sin(a)*s - 1.0,
      life: 70 + Math.random()*30,
      color: COLORS[(Math.random()*COLORS.length)|0],
      size: 2 + Math.random()*2,
      toHeart: null
    });
  }
}

function heartPoint(t, scale){
  const x = 16 * Math.pow(Math.sin(t),3);
  const y = 13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t);
  return {x: x*scale, y: -y*scale};
}

let phase = 0;             // 0 fireworks, 1 morph, 2 done
let ticks = 0;
let introHidden = false;   // чтобы hideIntro вызывался один раз
let started = false;       // чтобы animate() запустился один раз после отсчёта

// ===== ОБРАТНЫЙ ОТСЧЁТ (3-2-1), затем старт анимации =====
let countdown = 3;
function startCountdown(){
  countdownEl.textContent = countdown;
  countdownEl.style.opacity = '1';
  countdownEl.style.transform = 'translateX(-50%) translateY(0)';

  const interval = setInterval(()=>{
    countdown--;
    if (countdown > 0) {
      countdownEl.textContent = countdown;
      countdownEl.style.transform = 'translateX(-50%) translateY(0) scale(1)';
    } else {
      clearInterval(interval);
      // убираем цифру
      countdownEl.style.opacity = '0';
      countdownEl.style.transform = 'translateX(-50%) translateY(-10%) scale(0.9)';
      // запускаем салют только сейчас
      if (!started){
        started = true;
        requestAnimationFrame(animate);
      }
    }
  }, 1000);
}
startCountdown();

// Аварийный таймер: если что-то пойдёт не так — спрячем интро через ~7.5с
setTimeout(() => {
  if (!introHidden) hideIntro();
}, 7500);

function animate(){
  requestAnimationFrame(animate);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if(phase===0){
    if(ticks%20===0){
      const dpr = window.devicePixelRatio || 1;
      const vw = canvas.width  / dpr;
      const vh = canvas.height / dpr;
      const x = vw * (0.25 + Math.random()*0.5);
      const y = vh * (0.35 + Math.random()*0.35);
      spawnBurst(x, y, 90, 3.9);
    }
    if(ticks>120){
      prepareHeartMorph();
      phase = 1;

      const big = document.getElementById('bigHeart');
      if (big) {
        big.style.opacity = '1';
        // Когда анимация большого сердца завершится — прячем интро плавно
        big.addEventListener('animationend', () => {
          setTimeout(hideIntro, 400);
        }, { once: true });
      }
    }
  }

  // обновление частиц
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    if(phase===0){
      p.vy += GRAVITY*0.08;
      p.x += p.vx; p.y += p.vy;
    } else if(phase===1 && p.toHeart){
      const dx = p.toHeart.x - p.x;
      const dy = p.toHeart.y - p.y;
      p.vx = dx * 0.06;
      p.vy = dy * 0.06;
      p.x += p.vx; p.y += p.vy;
      p.life -= 1.2;
    }
    p.life -= 0.7;
    if(p.life<=0) particles.splice(i,1);
  }

  // рендер частиц
  for(const p of particles){
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }

  ticks++;
}

function prepareHeartMorph(){
  const dpr = window.devicePixelRatio || 1;
  const vw = canvas.width  / dpr;
  const vh = canvas.height / dpr;
  const cx = vw/2;
  const cy = vh/2;
  const scale = Math.min(vw, vh)/20;

  const targets = [];
  const N = Math.max(140, particles.length);
  for(let i=0;i<N;i++){
    const t = (i/N) * Math.PI*2;
    const pt = heartPoint(t, scale*0.9);
    targets.push({x: cx + pt.x, y: cy + pt.y});
  }
  for(let i=0;i<particles.length;i++){
    particles[i].toHeart = targets[i % targets.length];
    particles[i].life = 120;
  }
}

// Плавный fade-out интро и показ контента
function hideIntro(){
  if (introHidden) return;
  introHidden = true;

  // добавим класс для плавного растворения, если есть стили .fade-out
  intro.classList.add('fade-out');
  // на всякий случай — если класса нет, применим напрямую:
  intro.style.opacity = intro.style.opacity || '0';
  intro.style.visibility = intro.style.visibility || 'hidden';

  setTimeout(() => {
    document.getElementById('content').hidden = false;

    // включаем скролл после интро
    document.body.classList.remove('loading');

    // мягко показываем секции и медиа
    revealContent();

    // старт слайдшоу и музыки — чуть позже, чтобы не дёргалось
    setTimeout(() => {
      startSlideshow();
      tryStartMusic();
    }, 150);
  }, 1200); // совпадает с CSS transition у fade-out
}

/* ================== Плавное проявление контента ================== */
function revealContent(){
  const toReveal = document.querySelectorAll('.reveal');
  const imgs = document.querySelectorAll('main img:not(#slideImage)');
  const vids = document.querySelectorAll('main video');

  // секции плавно проявляются при появлении в зоне видимости
  const io = new IntersectionObserver((entries, obs)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        en.target.classList.add('show');
        obs.unobserve(en.target);
      }
    });
  }, {threshold: 0.1});
  toReveal.forEach(el => io.observe(el));

  // изображения — показываем при load, а если вдруг ошибка, всё равно не прячем контейнер
  imgs.forEach(img => {
    const show = () => img.classList.add('show');
    if (img.complete) show();
    else img.addEventListener('load', show, {once:true});
    img.addEventListener('error', show, {once:true});
  });

  // видео — делаем видимыми при любых адекватных событиях, плюс подстраховка таймером
  vids.forEach(v => {
    const makeVisible = () => v.classList.add('show');

    v.addEventListener('loadedmetadata', makeVisible, {once:true});
    v.addEventListener('loadeddata', makeVisible, {once:true});
    v.addEventListener('canplay', makeVisible, {once:true});
    v.addEventListener('error', makeVisible, {once:true});

    setTimeout(makeVisible, 1500); // на случай file:// без событий
  });
}

/* ================== ФОНОВЫЕ СЕРДЕЧКИ (твой простой стиль) ================== */
function createHeart(){
  const container = document.querySelector('.hearts') || document.body;
  const h = document.createElement('div');
  h.className = 'heart';
  h.style.left = Math.random()*100 + 'vw';  // случайная горизонталь
  h.style.bottom = '-24px';                 // старт чуть ниже экрана
  const dur = 6 + Math.random()*4;          // скорость 6–10s
  h.style.animationDuration = dur + 's';
  container.appendChild(h);
  setTimeout(()=>h.remove(), (dur+3)*1000);
}
setInterval(createHeart, 500);

/* ================== СЛАЙДШОУ ================== */
const slides = [
  'images/photo1.jpg',
  'images/photo2.jpg',
  'images/photo3.jpg',
  'images/photo4.jpg',
  'images/photo5.jpg',
  'images/photo6.jpg',
  'images/photo7.jpg',
  'images/photo8.jpg'
];
let slideIndex = 0;
let slideTimer = null;

function renderDots(){
  const dots = document.getElementById('slideDots');
  dots.innerHTML = '';
  slides.forEach((_,i)=>{
    const b = document.createElement('button');
    b.addEventListener('click', ()=>showSlide(i, true));
    if(i===slideIndex) b.classList.add('active');
    dots.appendChild(b);
  });
}

function showSlide(i, user=false){
  slideIndex = (i+slides.length) % slides.length;
  const img = document.getElementById('slideImage');
  img.classList.remove('show');
  setTimeout(()=>{ img.src = slides[slideIndex]; }, 150);
  img.onload = ()=> img.classList.add('show');
  renderDots();
  if(user){
    clearInterval(slideTimer);
    slideTimer = setInterval(()=>showSlide(slideIndex+1), 3000);
  }
}

function startSlideshow(){
  renderDots();
  showSlide(0);
  slideTimer = setInterval(()=>showSlide(slideIndex+1), 3000);
}

/* ================== МУЗЫКА ================== */
const audio = document.getElementById('bgm');
const playBtn = document.getElementById('playMusic');

function fadeInAudio(targetVol=0.7, ms=1200){
  audio.volume = 0;
  const steps = 24;
  const step = targetVol/steps;
  const int = ms/steps;
  let i = 0;
  const t = setInterval(()=>{
    i++; audio.volume = Math.min(targetVol, audio.volume + step);
    if(i>=steps){ clearInterval(t); }
  }, int);
}

async function tryStartMusic(){
  if(!audio) return;
  try{
    audio.volume = 0.001; // шанс на автоплей
    await audio.play();
    fadeInAudio(0.7, 1000);
    if (playBtn) playBtn.hidden = true;
  }catch(e){
    if (playBtn) playBtn.hidden = false;
  }
}

playBtn?.addEventListener('click', async ()=>{
  try{
    await audio.play();
    fadeInAudio(0.7, 1000);
    playBtn.classList.add('hide');
    setTimeout(()=> playBtn.hidden = true, 300);
  }catch(err){
    alert('Не удалось запустить музыку: ' + err.message);
  }
});
