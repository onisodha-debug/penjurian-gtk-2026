/* =====================================================
   KONFIGURASI
   ===================================================== */

const API_URL =
  'https://script.google.com/macros/s/AKfycbxvH2PRAXgZTtePXBm2vsnNt0WfhOgCayNzPTVrnrmf1iXFZ8hO6o7Ywhqz5LCBmlAx/exec';


/* =====================================================
   STATE APLIKASI
   ===================================================== */

let state = {

  token: null,

  juri: null,

  kategori: null,

  peserta: [],

  pesertaAktif: null,

  scores: [null, null, null, null, null, null]

};


/* =====================================================
   NAMA KATEGORI
   ===================================================== */

const CATEGORY_NAMES = {

  kepala:
    'Kepala Sekolah Transformatif',

  guruTransformatif:
    'Guru Transformatif',

  guruDedikatif:
    'Guru Dedikatif'

};


/* =====================================================
   ASPEK PENILAIAN
   ===================================================== */

const ASPECTS = {

  kepala: [
    {
      name: 'Orisinalitas',
      weight: 15
    },
    {
      name: 'Kesesuaian dan Kedalaman Tema',
      weight: 20
    },
    {
      name: 'Nilai Transformatif & Kebaruan',
      weight: 25
    },
    {
      name: 'Kolaborasi Dan Pemanfaatan Sumber Daya',
      weight: 15
    },
    {
      name: 'Dampak Nyata Dan Kekuatan Bukti',
      weight: 15
    },
    {
      name: 'Keberlanjutan, Pengimbasan, Dan Daya Inspirasi',
      weight: 10
    }
  ],

  guruTransformatif: [
    {
      name: 'Orisinalitas',
      weight: 15
    },
    {
      name: 'Kesesuaian dan Kedalaman Tema',
      weight: 20
    },
    {
      name: 'Nilai Transformatif & Kebaruan',
      weight: 25
    },
    {
      name: 'Kolaborasi Dan Pemanfaatan Sumber Daya',
      weight: 15
    },
    {
      name: 'Dampak Nyata Dan Kekuatan Bukti',
      weight: 15
    },
    {
      name: 'Keberlanjutan, Pengimbasan, Dan Daya Inspirasi',
      weight: 10
    }
  ],

  guruDedikatif: [
    {
      name: 'Orisinalitas dan Kesesuaian Tema',
      weight: 10
    },
    {
      name: 'Tingkat Kesulitan, Keterbatasan dan Risiko',
      weight: 20
    },
    {
      name: 'Komitmen, Konsistensi dan Keberlanjutan',
      weight: 20
    },
    {
      name: 'Resiliensi dan Pemecahan Masalah',
      weight: 25
    },
    {
      name: 'Dampak Nyata dan Kebermanfaatan',
      weight: 20
    },
    {
      name: 'Refleksi dan Daya Inspirasi',
      weight: 5
    }
  ]

};


/* =====================================================
   JSONP REQUEST
   ===================================================== */

/*
 * Kita menggunakan JSONP untuk request GET
 * sehingga frontend GitHub tidak bergantung
 * pada CORS response dari Apps Script.
 */

function apiGet(params) {

  return new Promise(
    function(resolve, reject) {

      const callbackName =
        'jsonp_' +
        Date.now() +
        '_' +
        Math.floor(
          Math.random() * 100000
        );


      const script =
        document.createElement('script');


      const query =
        new URLSearchParams(params);


      query.set(
        'callback',
        callbackName
      );


      const timeout =
        setTimeout(
          function() {

            cleanup();

            reject(
              new Error(
                'Server tidak merespons.'
              )
            );

          },
          20000
        );


      window[callbackName] =
        function(data) {

          cleanup();

          resolve(data);
        };


      script.onerror =
        function() {

          cleanup();

          reject(
            new Error(
              'Gagal terhubung ke Apps Script.'
            )
          );
        };


      function cleanup() {

        clearTimeout(timeout);

        delete window[callbackName];

        script.remove();
      }


      script.src =
        API_URL +
        '?' +
        query.toString();


      document.body.appendChild(
        script
      );

    }
  );
}


/* =====================================================
   LOGIN
   ===================================================== */

async function login() {

  const juri =
    document
      .getElementById('juriSelect')
      .value;


  const pin =
    document
      .getElementById('pinInput')
      .value
      .trim();


  const message =
    document
      .getElementById('loginMessage');


  message.textContent = '';

  message.className =
    'message';


  if (!juri) {

    showLoginError(
      'Silakan pilih juri.'
    );

    return;
  }


  if (!pin) {

    showLoginError(
      'Silakan masukkan PIN.'
    );

    return;
  }


  showLoading(true);


  try {

    const result =
      await apiGet({

        action: 'login',

        juri: juri,

        pin: pin

      });


    if (!result.success) {

      showLoginError(
        result.message ||
        'Login gagal.'
      );

      return;
    }


    state.token =
      result.token;


    state.juri =
      result.juri;


    localStorage.setItem(
      'gtk_token',
      state.token
    );


    localStorage.setItem(
      'gtk_juri',
      state.juri
    );


    document
      .getElementById('juriInfo')
      .textContent =
      state.juri;


    showDashboard();

    await loadParticipants();


  } catch (error) {

    showLoginError(
      error.message
    );

  } finally {

    showLoading(false);
  }
}


/* =====================================================
   LOAD SESSION
   ===================================================== */

async function restoreSession() {

  const token =
    localStorage.getItem(
      'gtk_token'
    );


  const juri =
    localStorage.getItem(
      'gtk_juri'
    );


  if (!token || !juri) {

    return;
  }


  state.token =
    token;

  state.juri =
    juri;


  try {

    const result =
      await apiGet({

        action: 'peserta',

        token: token

      });


    if (!result.success) {

      logout();

      return;
    }


    document
      .getElementById('juriInfo')
      .textContent =
      juri;


    showDashboard();

    renderParticipantsData(
      result
    );


  } catch (error) {

    logout();
  }
}


/* =====================================================
   LOAD PESERTA
   ===================================================== */

async function loadParticipants() {

  showLoading(true);


  try {

    const result =
      await apiGet({

        action: 'peserta',

        token: state.token

      });


    if (!result.success) {

      throw new Error(
        result.message
      );
    }


    renderParticipantsData(
      result
    );


  } catch (error) {

    alert(
      error.message
    );

  } finally {

    showLoading(false);
  }
}


/* =====================================================
   SIMPAN DATA PESERTA KE STATE
   ===================================================== */

function renderParticipantsData(
  result
) {

  state.participants =
    result.kategori || {};
}


/* =====================================================
   BUKA KATEGORI
   ===================================================== */

function openCategory(
  kategori
) {

  state.kategori =
    kategori;


  const title =
    document
      .getElementById('categoryTitle');


  title.textContent =
    CATEGORY_NAMES[kategori];


  renderParticipantList();


  document
    .getElementById('categoryPage')
    .classList
    .add('hidden');


  document
    .getElementById('scoringPage')
    .classList
    .add('hidden');


  document
    .getElementById('participantPage')
    .classList
    .remove('hidden');
}


/* =====================================================
   RENDER PESERTA
   ===================================================== */

function renderParticipantList() {

  const container =
    document
      .getElementById(
        'participantList'
      );


  container.innerHTML = '';


  const list =
    state.participants[
      state.kategori
    ] || [];


  state.peserta =
    list;


  list.forEach(
    function(peserta) {

      const card =
        document.createElement(
          'div'
        );


      card.className =
        'participant-card';


      const status =
        peserta.total > 0
          ? 'Sudah ada nilai'
          : 'Belum dinilai';


      card.innerHTML = `

        <div class="participant-number">
          ${peserta.noPeserta}
        </div>

        <div class="participant-name">
          ${escapeHtml(
            peserta.nama
          )}
        </div>

        <div class="participant-status">
          ${status}
        </div>

      `;


      card.onclick =
        function() {

          openParticipant(
            peserta
          );
        };


      container.appendChild(
        card
      );

    }
  );
}


/* =====================================================
   BUKA PESERTA
   ===================================================== */

async function openParticipant(
  peserta
) {

  state.pesertaAktif =
    peserta;


  showLoading(true);


  try {

    const result =
      await apiGet({

        action: 'nilai',

        token: state.token,

        kategori:
          state.kategori,

        noPeserta:
          peserta.noPeserta

      });


    if (!result.success) {

      throw new Error(
        result.message
      );
    }


    state.scores =
      result.skor.map(
        function(value) {

          return value === null
            ? null
            : Number(value);

        }
      );


    document
      .getElementById(
        'participantName'
      )
      .textContent =
      result.nama;


    document
      .getElementById(
        'participantCategory'
      )
      .textContent =
      CATEGORY_NAMES[
        state.kategori
      ];


    document
      .getElementById(
        'scoreJuri'
      )
      .textContent =
      state.juri;


    document
      .getElementById(
        'scoreNo'
      )
      .textContent =
      peserta.noPeserta;


    renderScoreForm(
      result.terkunci
    );


    document
      .getElementById(
        'participantPage'
      )
      .classList
      .add('hidden');


    document
      .getElementById(
        'scoringPage'
      )
      .classList
      .remove('hidden');


  } catch (error) {

    alert(
      error.message
    );

  } finally {

    showLoading(false);
  }
}


/* =====================================================
   FORM SKOR
   ===================================================== */

function renderScoreForm(
  locked
) {

  const container =
    document
      .getElementById(
        'scoreForm'
      );


  container.innerHTML = '';


  const aspects =
    ASPECTS[
      state.kategori
    ];


  aspects.forEach(
    function(aspect, index) {

      const item =
        document.createElement(
          'div'
        );


      item.className =
        'score-item';


      item.innerHTML = `

        <div class="score-item-header">

          <div class="score-item-title">
            ${index + 1}.
            ${escapeHtml(
              aspect.name
            )}
          </div>

          <div class="score-item-weight">
            Bobot ${aspect.weight}%
          </div>

        </div>

        <div class="score-buttons">

          ${scoreButton(
            index,
            1,
            locked
          )}

          ${scoreButton(
            index,
            2,
            locked
          )}

          ${scoreButton(
            index,
            3,
            locked
          )}

          ${scoreButton(
            index,
            4,
            locked
          )}

        </div>

      `;


      container.appendChild(
        item
      );
    }
  );


  if (locked) {

    document
      .getElementById(
        'scoreMessage'
      )
      .textContent =
      '🔒 Nilai peserta ini sudah dikunci.';

    document
      .getElementById(
        'scoreMessage'
      )
      .className =
      'message error';

  } else {

    document
      .getElementById(
        'scoreMessage'
      )
      .textContent = '';

  }
}


/* =====================================================
   BUTTON SKOR
   ===================================================== */

function scoreButton(
  aspectIndex,
  score,
  locked
) {

  const selected =
    state.scores[
      aspectIndex
    ] === score
      ? 'selected'
      : '';


  const disabled =
    locked
      ? 'disabled'
      : '';


  return `

    <button
      type="button"
      class="score-button ${selected}"
      ${disabled}
      onclick="selectScore(
        ${aspectIndex},
        ${score}
      )"
    >
      ${score}
    </button>

  `;
}


/* =====================================================
   PILIH SKOR
   ===================================================== */

function selectScore(
  aspectIndex,
  score
) {

  state.scores[
    aspectIndex
  ] = score;


  renderScoreForm(false);
}


/* =====================================================
   SIMPAN NILAI
   ===================================================== */

async function saveScore() {

  const incomplete =
    state.scores.some(
      function(score) {

        return ![1, 2, 3, 4]
          .includes(score);

      }
    );


  if (incomplete) {

    alert(
      'Semua 6 aspek harus diberi skor.'
    );

    return;
  }


  showLoading(true);


  try {

    const result =
      await apiGet({

        action:
          'simpanNilai',

        token:
          state.token,

        kategori:
          state.kategori,

        noPeserta:
          state
            .pesertaAktif
            .noPeserta,

        skor1:
          state.scores[0],

        skor2:
          state.scores[1],

        skor3:
          state.scores[2],

        skor4:
          state.scores[3],

        skor5:
          state.scores[4],

        skor6:
          state.scores[5]

      });


    if (!result.success) {

      throw new Error(
        result.message
      );
    }


    document
      .getElementById(
        'scoreMessage'
      )
      .textContent =
      '✓ Nilai berhasil disimpan.';

    document
      .getElementById(
        'scoreMessage'
      )
      .className =
      'message success';


    await loadParticipants();


  } catch (error) {

    alert(
      error.message
    );

  } finally {

    showLoading(false);
  }
}


/* =====================================================
   KUNCI NILAI
   ===================================================== */

async function lockScore() {

  if (
    !confirm(
      'Setelah dikunci, nilai peserta ini tidak dapat diubah oleh juri. Lanjutkan?'
    )
  ) {

    return;
  }


  showLoading(true);


  try {

    const result =
      await apiGet({

        action:
          'kunciNilai',

        token:
          state.token,

        kategori:
          state.kategori,

        noPeserta:
          state
            .pesertaAktif
            .noPeserta

      });


    if (!result.success) {

      throw new Error(
        result.message
      );
    }


    alert(
      'Nilai berhasil dikunci.'
    );


    backToParticipants();


  } catch (error) {

    alert(
      error.message
    );

  } finally {

    showLoading(false);
  }
}


/* =====================================================
   NAVIGASI
   ===================================================== */

function showDashboard() {

  document
    .getElementById(
      'loginPage'
    )
    .classList
    .add('hidden');


  document
    .getElementById(
      'dashboardPage'
    )
    .classList
    .remove('hidden');


  document
    .getElementById(
      'categoryPage'
    )
    .classList
    .remove('hidden');


  document
    .getElementById(
      'participantPage'
    )
    .classList
    .add('hidden');


  document
    .getElementById(
      'scoringPage'
    )
    .classList
    .add('hidden');
}


function backToCategories() {

  document
    .getElementById(
      'participantPage'
    )
    .classList
    .add('hidden');


  document
    .getElementById(
      'scoringPage'
    )
    .classList
    .add('hidden');


  document
    .getElementById(
      'categoryPage'
    )
    .classList
    .remove('hidden');
}


function backToParticipants() {

  document
    .getElementById(
      'scoringPage'
    )
    .classList
    .add('hidden');


  document
    .getElementById(
      'participantPage'
    )
    .classList
    .remove('hidden');


  renderParticipantList();
}


/* =====================================================
   LOGOUT
   ===================================================== */

function logout() {

  localStorage.removeItem(
    'gtk_token'
  );

  localStorage.removeItem(
    'gtk_juri'
  );


  state = {

    token: null,

    juri: null,

    kategori: null,

    peserta: [],

    pesertaAktif: null,

    scores: [
      null,
      null,
      null,
      null,
      null,
      null
    ]

  };


  document
    .getElementById(
      'dashboardPage'
    )
    .classList
    .add('hidden');


  document
    .getElementById(
      'loginPage'
    )
    .classList
    .remove('hidden');


  document
    .getElementById(
      'pinInput'
    )
    .value = '';
}


/* =====================================================
   LOADING
   ===================================================== */

function showLoading(
  show
) {

  document
    .getElementById(
      'loading'
    )
    .classList
    .toggle(
      'hidden',
      !show
    );
}


/* =====================================================
   LOGIN ERROR
   ===================================================== */

function showLoginError(
  message
) {

  const element =
    document
      .getElementById(
        'loginMessage'
      );


  element.textContent =
    message;


  element.className =
    'message error';
}


/* =====================================================
   ESCAPE HTML
   ===================================================== */

function escapeHtml(
  value
) {

  return String(
    value ?? ''
  )
  .replace(
    /&/g,
    '&amp;'
  )
  .replace(
    /</g,
    '&lt;'
  )
  .replace(
    />/g,
    '&gt;'
  )
  .replace(
    /"/g,
    '&quot;'
  )
  .replace(
    /'/g,
    '&#039;'
  );
}


/* =====================================================
   START
   ===================================================== */

document.addEventListener(
  'DOMContentLoaded',
  function() {

    restoreSession();

  }
);
