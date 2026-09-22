/* =====================================================
   KONFIGURASI
   ===================================================== */

const API_URL =
  'https://script.google.com/macros/s/AKfycbxvH2PRAXgZTtePXBm2vsnNt0WfhOgCayNzPTVrnrmf1iXFZ8hO6o7Ywhqz5LCBmlAx/exec';


/* =====================================================
   STATE
   ===================================================== */

let adminToken = null;

let currentRekap = null;


/* =====================================================
   JSONP
   ===================================================== */

function apiGet(params) {

  return new Promise(
    function(resolve, reject) {

      const callbackName =
        'admin_jsonp_' +
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
   LOGIN ADMIN
   ===================================================== */

async function adminLogin() {

  const pin =
    document
      .getElementById('adminPin')
      .value
      .trim();


  const message =
    document
      .getElementById(
        'adminLoginMessage'
      );


  message.textContent = '';

  message.className =
    'message';


  if (!pin) {

    message.textContent =
      'Masukkan PIN admin.';

    message.className =
      'message error';

    return;
  }


  showLoading(true);


  try {

    const result =
      await apiGet({

        action:
          'loginAdmin',

        pin:
          pin

      });


    if (!result.success) {

      throw new Error(
        result.message ||
        'Login admin gagal.'
      );
    }


    adminToken =
      result.token;


    localStorage.setItem(
      'gtk_admin_token',
      adminToken
    );


    showAdminDashboard();


    await loadDashboard();


  } catch (error) {

    message.textContent =
      error.message;

    message.className =
      'message error';

  } finally {

    showLoading(false);
  }
}


/* =====================================================
   RESTORE ADMIN SESSION
   ===================================================== */

async function restoreAdminSession() {

  const token =
    localStorage.getItem(
      'gtk_admin_token'
    );


  if (!token) {

    return;
  }


  adminToken =
    token;


  try {

    const result =
      await apiGet({

        action:
          'rekap',

        token:
          adminToken

      });


    if (!result.success) {

      adminLogout();

      return;
    }


    showAdminDashboard();


    await loadDashboard();


  } catch (error) {

    adminLogout();
  }
}


/* =====================================================
   TAMPILKAN DASHBOARD
   ===================================================== */

function showAdminDashboard() {

  document
    .getElementById(
      'adminLoginPage'
    )
    .classList
    .add('hidden');


  document
    .getElementById(
      'adminDashboard'
    )
    .classList
    .remove('hidden');
}


/* =====================================================
   LOAD DASHBOARD
   ===================================================== */

async function loadDashboard() {

  try {

    await Promise.all([

      loadStatusJuri(),

      loadRekap(),

      loadJuara()

    ]);

  } catch (error) {

    console.error(
      'Dashboard error:',
      error
    );

    alert(
      'Sebagian data dashboard gagal dimuat: ' +
      error.message
    );
  }
}


/* =====================================================
   STATUS JURI
   ===================================================== */

async function loadStatusJuri() {

  const result =
    await apiGet({

      action:
        'statusJuri',

      token:
        adminToken

    });


  if (!result.success) {

    throw new Error(
      result.message ||
      'Gagal mengambil status juri.'
    );
  }


  const data =
    Array.isArray(result.data)
      ? result.data
      : [];


  /*
   * ==================================================
   * RINGKASAN 3 KATEGORI
   *
   * Yang dihitung adalah JUMLAH PENILAIAN JURI,
   * bukan jumlah peserta unik.
   *
   * Misalnya:
   * 12 peserta x 6 juri = 72 penilaian maksimum.
   * ==================================================
   */

  const summary = {

    kepala: {
      sudah: 0,
      total: 0
    },

    guruTransformatif: {
      sudah: 0,
      total: 0
    },

    guruDedikatif: {
      sudah: 0,
      total: 0
    }

  };


  data.forEach(
    function(item) {

      const kategori =
        item.kategori || {};


      /* ------------------------------------------
         KEPALA SEKOLAH
         ------------------------------------------ */

      if (kategori.kepala) {

        summary.kepala.sudah +=
          Number(
            kategori.kepala.sudahDinilai || 0
          );


        summary.kepala.total =
          Math.max(
            summary.kepala.total,

            Number(
              kategori.kepala.totalPeserta || 0
            )
          );

      }


      /* ------------------------------------------
         GURU TRANSFORMATIF
         ------------------------------------------ */

      if (
        kategori.guruTransformatif
      ) {

        summary.guruTransformatif.sudah +=
          Number(
            kategori
              .guruTransformatif
              .sudahDinilai || 0
          );


        summary.guruTransformatif.total =
          Math.max(
            summary.guruTransformatif.total,

            Number(
              kategori
                .guruTransformatif
                .totalPeserta || 0
            )
          );

      }


      /* ------------------------------------------
         GURU DEDIKATIF
         ------------------------------------------ */

      if (
        kategori.guruDedikatif
      ) {

        summary.guruDedikatif.sudah +=
          Number(
            kategori
              .guruDedikatif
              .sudahDinilai || 0
          );


        summary.guruDedikatif.total =
          Math.max(
            summary.guruDedikatif.total,

            Number(
              kategori
                .guruDedikatif
                .totalPeserta || 0
            )
          );

      }

    }
  );


  /*
   * Karena totalPeserta berasal dari satu juri,
   * maka total maksimum penilaian =
   *
   * jumlah peserta x 6 juri
   */

  summary.kepala.total *= 6;

  summary.guruTransformatif.total *= 6;

  summary.guruDedikatif.total *= 6;


  /*
   * Tampilkan kartu ringkasan
   */

  renderSummaryCards(
    summary
  );


  /*
   * ==================================================
   * TABEL STATUS 6 JURI
   * ==================================================
   */

  const tbody =
    document.querySelector(
      '#juryStatusTable tbody'
    );


  if (!tbody) {

    return;
  }


  tbody.innerHTML = '';


  data.forEach(
    function(item) {

      const tr =
        document.createElement(
          'tr'
        );


      const kategori =
        item.kategori || {};


      tr.innerHTML = `

        <td>
          <strong>
            ${escapeHtml(
              item.juri || '-'
            )}
          </strong>
        </td>

        <td>
          ${progress(
            kategori.kepala
          )}
        </td>

        <td>
          ${progress(
            kategori.guruTransformatif
          )}
        </td>

        <td>
          ${progress(
            kategori.guruDedikatif
          )}
        </td>

      `;


      tbody.appendChild(
        tr
      );

    }
  );

}


/* =====================================================
   SUMMARY CARDS
   ===================================================== */

function renderSummaryCards(
  summary
) {

  const container =
    document.getElementById(
      'summaryCards'
    );


  if (!container) {

    return;
  }


  const cards = [

    {
      title:
        'Kepala Sekolah Transformatif',

      data:
        summary.kepala
    },

    {
      title:
        'Guru Transformatif',

      data:
        summary.guruTransformatif
    },

    {
      title:
        'Guru Dedikatif',

      data:
        summary.guruDedikatif
    }

  ];


  container.innerHTML = '';


  cards.forEach(
    function(card) {

      const total =
        Number(
          card.data.total || 0
        );


      const sudah =
        Number(
          card.data.sudah || 0
        );


      const persen =
        total > 0
          ? Math.round(
              (
                sudah /
                total
              ) * 100
            )
          : 0;


      const belum =
        Math.max(
          total - sudah,
          0
        );


      const element =
        document.createElement(
          'div'
        );


      element.className =
        'admin-summary-card';


      element.innerHTML = `

        <div class="summary-title">
          ${escapeHtml(
            card.title
          )}
        </div>

        <div class="summary-number">
          ${sudah}
          <span>
            / ${total}
          </span>
        </div>

        <div class="summary-label">
          penilaian juri selesai
        </div>

        <div class="summary-progress">

          <div
            class="summary-progress-fill"
            style="width:${persen}%"
          ></div>

        </div>

        <div class="summary-footer">

          <span>
            ${persen}% selesai
          </span>

          <span>
            ${belum} belum
          </span>

        </div>

      `;


      container.appendChild(
        element
      );

    }
  );

}


/* =====================================================
   PROGRESS JURI
   ===================================================== */

function progress(
  data
) {

  if (!data) {

    return `
      <span>-</span>
    `;
  }


  const sudah =
    Number(
      data.sudahDinilai || 0
    );


  const total =
    Number(
      data.totalPeserta || 0
    );


  const persentase =
    Number(
      data.persentase || 0
    );


  return `

    <div>

      <strong>
        ${sudah}/${total}
      </strong>

      <div class="progress-bar">

        <div
          class="progress-fill"
          style="
            width:${persentase}%;
          "
        ></div>

      </div>

      <small>
        ${persentase}%
      </small>

    </div>

  `;
}


/* =====================================================
   LOAD REKAP
   ===================================================== */

async function loadRekap() {

  const result =
    await apiGet({

      action:
        'rekap',

      token:
        adminToken

    });


  if (!result.success) {

    throw new Error(
      result.message ||
      'Gagal mengambil rekap.'
    );
  }


  currentRekap =
    result.data;


  loadRekapCategory();
}


/* =====================================================
   TAMPILKAN REKAP KATEGORI
   ===================================================== */

function loadRekapCategory() {

  if (!currentRekap) {

    return;
  }


  const selector =
    document.getElementById(
      'rekapCategory'
    );


  const table =
    document.getElementById(
      'rekapTable'
    );


  if (!selector || !table) {

    return;
  }


  const kategori =
    selector.value;


  const data =
    currentRekap[
      kategori
    ];


  if (!data) {

    return;
  }


  const tbody =
    table.querySelector(
      'tbody'
    );


  tbody.innerHTML = '';


  const peserta =
    Array.isArray(
      data.peserta
    )
      ? data.peserta
      : [];


  peserta.forEach(
    function(item) {

      const tr =
        document.createElement(
          'tr'
        );


      const nilaiJuri =
        Array.isArray(
          item.juri
        )
          ? item.juri
          : [];


      tr.innerHTML = `

        <td>
          ${item.no ?? '-'}
        </td>

        <td>
          ${escapeHtml(
            item.nama || '-'
          )}
        </td>

        ${nilaiJuri.map(
          function(nilai) {

            return `

              <td>
                ${
                  Number(nilai) > 0
                    ? formatNumber(nilai)
                    : '-'
                }
              </td>

            `;

          }
        ).join('')}

        <td>
          <strong>
            ${
              Number(
                item.rataRata || 0
              ) > 0

                ? formatNumber(
                    item.rataRata
                  )

                : '-'
            }
          </strong>
        </td>

        <td>
          ${
            item.peringkat
              ? item.peringkat
              : '-'
          }
        </td>

      `;


      tbody.appendChild(
        tr
      );

    }
  );

}


/* =====================================================
   LOAD HASIL JUARA
   ===================================================== */

async function loadJuara() {

  const result =
    await apiGet({

      action:
        'juara',

      token:
        adminToken

    });


  if (!result.success) {

    throw new Error(
      result.message ||
      'Gagal mengambil hasil juara.'
    );
  }


  const container =
    document.getElementById(
      'winnerContainer'
    );


  if (!container) {

    return;
  }


  container.innerHTML = '';


  const data =
    result.data || {};


  Object.keys(
    data
  ).forEach(
    function(key) {

      const category =
        data[key];


      const section =
        document.createElement(
          'div'
        );


      section.className =
        'winner-section';


      let html = `

        <h3>
          ${escapeHtml(
            category.kategori ||
            key
          )}
        </h3>

      `;


      const juara =
        Array.isArray(
          category.juara
        )
          ? category.juara
          : [];


      juara.forEach(
        function(item) {

          let medal = '';


          if (
            Number(item.juara) === 1
          ) {

            medal = '🥇';

          } else if (
            Number(item.juara) === 2
          ) {

            medal = '🥈';

          } else if (
            Number(item.juara) === 3
          ) {

            medal = '🥉';

          }


          html += `

            <div class="winner-row">

              <div class="winner-rank">

                ${medal}

                ${item.juara}

              </div>

              <div class="winner-name">

                ${escapeHtml(
                  item.nama || '-'
                )}

              </div>

              <div class="winner-score">

                ${
                  Number(
                    item.rataRata || 0
                  ) > 0

                    ? formatNumber(
                        item.rataRata
                      )

                    : '-'
                }

              </div>

            </div>

          `;

        }
      );


      section.innerHTML =
        html;


      container.appendChild(
        section
      );

    }
  );

}


/* =====================================================
   LOGOUT
   ===================================================== */

function adminLogout() {

  localStorage.removeItem(
    'gtk_admin_token'
  );


  adminToken =
    null;


  currentRekap =
    null;


  document
    .getElementById(
      'adminDashboard'
    )
    .classList
    .add('hidden');


  document
    .getElementById(
      'adminLoginPage'
    )
    .classList
    .remove('hidden');


  document
    .getElementById(
      'adminPin'
    )
    .value = '';

}


/* =====================================================
   FORMAT ANGKA
   ===================================================== */

function formatNumber(
  value
) {

  const number =
    Number(value);


  if (
    !Number.isFinite(number)
  ) {

    return '-';
  }


  return number
    .toFixed(4)
    .replace(
      /\.?0+$/,
      ''
    );
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
   LOADING
   ===================================================== */

function showLoading(
  show
) {

  const element =
    document.getElementById(
      'loading'
    );


  if (!element) {

    return;
  }


  element.classList.toggle(
    'hidden',
    !show
  );

}


/* =====================================================
   START
   ===================================================== */

document.addEventListener(
  'DOMContentLoaded',
  function() {

    restoreAdminSession();

  }
);
