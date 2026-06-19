/* Городские птицы Саратова — клиентское приложение (без сборки).
   Хеш-роутинг:  #/            — галерея
                 #/bird/<id>   — страница птицы
*/
(function () {
  "use strict";

  var BIRDS = window.BIRDS || [];
  var app = document.getElementById("app");

  // Пути к ассетам с корректным кодированием кириллицы/пробелов.
  function imgUrl(file) { return "img/" + encodeURIComponent(file); }
  function audioUrl(file) { return "mp3birds/" + encodeURIComponent(file); }

  function indexById(id) {
    for (var i = 0; i < BIRDS.length; i++) if (BIRDS[i].id === id) return i;
    return -1;
  }

  // Куда и как перейти при следующей перерисовке.
  var nav = { dir: null, keepScroll: false };

  function goHome() {
    nav = { dir: null, keepScroll: false };
    if (location.hash === "#/" || location.hash === "") render();
    location.hash = "#/";
  }

  function goToBird(id, opts) {
    nav = {
      dir: (opts && opts.dir) || null,
      keepScroll: !!(opts && opts.keepScroll)
    };
    var target = "#/bird/" + id;
    if (location.hash === target) render(); else location.hash = target;
  }

  /* ---------- Постер-плитка ---------- */
  function posterTile(bird) {
    var a = document.createElement("a");
    a.className = "poster";
    a.href = "#/bird/" + bird.id;
    a.setAttribute("aria-label", bird.title);
    var img = document.createElement("img");
    img.src = imgUrl(bird.image);
    img.alt = bird.title;
    img.loading = "lazy";
    a.appendChild(img);
    return a;
  }

  /* ---------- Галерея (главная) ---------- */
  function renderHome() {
    // Ровная сетка постеров: 3 в ряд на телефоне, 6 в ряд на компьютере.
    var grid = document.createElement("div");
    grid.className = "gallery";
    BIRDS.forEach(function (b) { grid.appendChild(posterTile(b)); });

    app.className = "app app--home";
    app.innerHTML = "";
    app.appendChild(grid);
    window.scrollTo(0, 0);
    nav = { dir: null, keepScroll: false };
  }

  /* ---------- Аудиоплеер ---------- */
  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function buildAudioPlayer(bird) {
    var panel = document.createElement("div");
    panel.className = "audio";

    if (!bird.audio) {
      panel.classList.add("audio--empty");
      panel.innerHTML =
        '<div class="audio__btn audio__btn--disabled" aria-hidden="true">' + iconPlay() + '</div>' +
        '<div class="audio__empty-text">Запись голоса скоро появится</div>';
      return panel;
    }

    var audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioUrl(bird.audio);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "audio__btn";
    btn.setAttribute("aria-label", "Воспроизвести голос");
    btn.innerHTML = iconPlay();

    var bars = document.createElement("div");
    bars.className = "audio__bars";
    var BAR_COUNT = 40;
    for (var i = 0; i < BAR_COUNT; i++) {
      var bar = document.createElement("span");
      // Псевдослучайная, но стабильная высота столбиков «волны».
      var h = 25 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 70;
      bar.style.height = h + "%";
      bars.appendChild(bar);
    }

    var track = document.createElement("div");
    track.className = "audio__track";
    track.appendChild(bars);
    track.setAttribute("role", "slider");
    track.setAttribute("aria-label", "Перемотка записи");

    var time = document.createElement("div");
    time.className = "audio__time";
    time.textContent = "0:00";

    panel.appendChild(btn);
    panel.appendChild(track);
    panel.appendChild(time);

    function setProgress(ratio) {
      ratio = Math.max(0, Math.min(1, ratio));
      var active = Math.round(ratio * BAR_COUNT);
      var children = bars.children;
      for (var i = 0; i < children.length; i++) {
        children[i].classList.toggle("is-played", i < active);
      }
    }

    btn.addEventListener("click", function () {
      // Останавливаем любую другую играющую запись.
      if (window.__currentAudio && window.__currentAudio !== audio) {
        window.__currentAudio.pause();
      }
      if (audio.paused) { audio.play(); } else { audio.pause(); }
    });

    audio.addEventListener("play", function () {
      window.__currentAudio = audio;
      panel.classList.add("is-playing");
      btn.innerHTML = iconPause();
      btn.setAttribute("aria-label", "Пауза");
    });
    audio.addEventListener("pause", function () {
      panel.classList.remove("is-playing");
      btn.innerHTML = iconPlay();
      btn.setAttribute("aria-label", "Воспроизвести голос");
    });
    audio.addEventListener("timeupdate", function () {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
      time.textContent = fmtTime(audio.currentTime);
    });
    audio.addEventListener("loadedmetadata", function () {
      time.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener("ended", function () {
      setProgress(0);
      time.textContent = fmtTime(audio.duration);
    });

    function seekFromEvent(e) {
      var rect = track.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      var ratio = rect.width ? x / rect.width : 0;
      if (audio.duration) {
        audio.currentTime = Math.max(0, Math.min(1, ratio)) * audio.duration;
        setProgress(ratio);
      }
    }
    track.addEventListener("click", seekFromEvent);

    // Остановить запись, когда плеер удаляется из DOM (смена птицы).
    panel.__cleanup = function () { try { audio.pause(); } catch (e) {} };

    return panel;
  }

  function iconPlay() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';
  }
  function iconPause() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"></path></svg>';
  }
  function iconChevron(dir) {
    var d = dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6";
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  }

  /* ---------- Страница птицы ---------- */
  function renderDetail(index) {
    var bird = BIRDS[index];
    var prev = BIRDS[(index - 1 + BIRDS.length) % BIRDS.length];
    var next = BIRDS[(index + 1) % BIRDS.length];

    var prevScroll = window.scrollY;

    var view = document.createElement("article");
    view.className = "detail";

    // --- Постер со стрелками ---
    var stage = document.createElement("div");
    stage.className = "detail__stage";

    var btnPrev = document.createElement("button");
    btnPrev.type = "button";
    btnPrev.className = "nav-arrow nav-arrow--prev";
    btnPrev.setAttribute("aria-label", "Предыдущая птица: " + prev.title);
    btnPrev.innerHTML = iconChevron("left");

    var btnNext = document.createElement("button");
    btnNext.type = "button";
    btnNext.className = "nav-arrow nav-arrow--next";
    btnNext.setAttribute("aria-label", "Следующая птица: " + next.title);
    btnNext.innerHTML = iconChevron("right");

    var posterBox = document.createElement("div");
    posterBox.className = "detail__poster";
    var posterImg = document.createElement("img");
    posterImg.src = imgUrl(bird.image);
    posterImg.alt = bird.title;
    posterBox.appendChild(posterImg);

    stage.appendChild(btnPrev);
    stage.appendChild(posterBox);
    stage.appendChild(btnNext);

    btnPrev.addEventListener("click", function () {
      goToBird(prev.id, { dir: "prev", keepScroll: true });
    });
    btnNext.addEventListener("click", function () {
      goToBird(next.id, { dir: "next", keepScroll: true });
    });

    // --- Аудио --- (у птицы может быть несколько записей с подписями)
    var audioPlayer;
    if (bird.audios && bird.audios.length) {
      audioPlayer = document.createElement("div");
      audioPlayer.className = "audio-group";
      bird.audios.forEach(function (a) {
        var label = document.createElement("p");
        label.className = "audio__label";
        label.textContent = a.label;
        audioPlayer.appendChild(label);
        audioPlayer.appendChild(buildAudioPlayer({ audio: a.file }));
      });
    } else {
      audioPlayer = buildAudioPlayer(bird);
    }

    // --- Описание ---
    var descSection = document.createElement("section");
    descSection.className = "detail__desc";
    var descTitle = document.createElement("h2");
    descTitle.className = "section-title";
    descTitle.textContent = "Описание:";
    var latin = document.createElement("p");
    latin.className = "detail__latin";
    latin.textContent = bird.latin;
    var descText = document.createElement("p");
    descText.className = "detail__text";
    descText.textContent = bird.desc;
    descSection.appendChild(descTitle);
    descSection.appendChild(latin);
    descSection.appendChild(descText);

    // Аудио и описание лежат в одном блоке: на телефоне идут друг под другом
    // (звук → описание), на компьютере образуют среднюю колонку (описание → звук).
    var info = document.createElement("div");
    info.className = "detail__info";
    info.appendChild(audioPlayer);
    info.appendChild(descSection);

    // --- Также может понравиться ---
    var suggest = document.createElement("section");
    suggest.className = "detail__suggest";
    var sugTitle = document.createElement("h2");
    sugTitle.className = "section-title";
    sugTitle.textContent = "Вам также может понравиться:";
    var grid = document.createElement("div");
    grid.className = "suggest-grid";
    BIRDS.forEach(function (b) {
      grid.appendChild(posterTile(b));
    });
    suggest.appendChild(sugTitle);
    suggest.appendChild(grid);

    view.appendChild(stage);
    view.appendChild(info);
    view.appendChild(suggest);

    // Останавливаем предыдущую запись и подменяем содержимое.
    cleanupAudio();
    app.className = "app app--detail";
    app.innerHTML = "";
    app.appendChild(view);

    // Сохранить позицию прокрутки при навигации стрелками, иначе — наверх.
    if (nav.keepScroll) window.scrollTo(0, prevScroll);
    else window.scrollTo(0, 0);

    // Плавное появление постера со стороны перехода.
    if (nav.dir) {
      posterImg.classList.add(nav.dir === "next" ? "slide-from-right" : "slide-from-left");
      descSection.classList.add("fade-in");
      // Запустить переход на следующем кадре.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          posterImg.classList.add("slide-active");
          posterImg.classList.remove("slide-from-right", "slide-from-left");
          descSection.classList.remove("fade-in");
        });
      });
    }

    // Сбрасываем намерение навигации, чтобы обычные клики по плиткам
    // (галерея, блок «также интересует») всегда прокручивали наверх без слайда.
    nav = { dir: null, keepScroll: false };
  }

  function cleanupAudio() {
    var players = app.querySelectorAll(".audio");
    for (var i = 0; i < players.length; i++) {
      if (players[i].__cleanup) players[i].__cleanup();
    }
    if (window.__currentAudio) { try { window.__currentAudio.pause(); } catch (e) {} }
  }

  /* ---------- Роутер ---------- */
  function render() {
    var hash = location.hash || "#/";
    var m = hash.match(/^#\/bird\/(.+)$/);
    if (m) {
      var idx = indexById(decodeURIComponent(m[1]));
      if (idx >= 0) { renderDetail(idx); return; }
    }
    cleanupAudio();
    renderHome();
  }

  // Навигация с клавиатуры на странице птицы.
  document.addEventListener("keydown", function (e) {
    if (!app.classList.contains("app--detail")) return;
    var m = (location.hash || "").match(/^#\/bird\/(.+)$/);
    if (!m) return;
    var idx = indexById(decodeURIComponent(m[1]));
    if (idx < 0) return;
    if (e.key === "ArrowLeft") {
      goToBird(BIRDS[(idx - 1 + BIRDS.length) % BIRDS.length].id, { dir: "prev", keepScroll: true });
    } else if (e.key === "ArrowRight") {
      goToBird(BIRDS[(idx + 1) % BIRDS.length].id, { dir: "next", keepScroll: true });
    }
  });

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", render);
  if (document.readyState !== "loading") render();
})();
