const API_URL =
  'https://script.google.com/macros/s/AKfycbxvH2PRAXgZTtePXBm2vsnNt0WfhOgCayNzPTVrnrmf1iXFZ8hO6o7Ywhqz5LCBmlAx/exec';


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
        result.message
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
   DASHBOARD
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

  await Promise.all([

    loadStatusJuri(),

    loadRekap(),

    loadJuara()

  ]);
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
      result.message
    );
  }


  const tbody =
    document
      .querySelector(
        '#juryStatusTable tbody'
      );


  tbody.innerHTML = '';


  result.data.forEach(
    function(item) {

      const tr =
        document.createElement(
          'tr'
        );


      tr.innerHTML = `

        <td>
          <strong>
            ${escapeHtml(
              item.juri
            )}
          </strong>
        </td>

        <td>
          ${progress(
            item.kategori.kepala
          )}
        </td>

        <td>
          ${progress(
            item.kategori.guruTransformatif
          )}
        </td>

        <td>
          ${progress(
            item.kategori.guruDedikatif
          )}
        </td>

      `;


      tbody.appendChild(tr);

    }
  );
}


/* =====================================================
   PROGRESS
   ===================================================== */

function progress(data) {

  return `

    <div>
      <strong>
        ${data.sudahDinilai}/${data.totalPeserta}
      </strong>

      <div class="progress-bar">

        <div
          class="progress-fill"
          style="
            width:${data.persentase}%;
          "
        ></div>

      </div>

      <small>
        ${data.persentase}%
      </small>

    </div>

  `;
}


/* =====================================================
   REKAP
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
      result.message
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


  const kategori =
    document
      .getElementById(
        'rekapCategory'
      )
      .value;


  const data =
    currentRekap[
      kategori
    ];


  if (!data) {

    return;
  }


  const tbody =
    document
      .querySelector(
        '#rekapTable tbody'
      );


  tbody.innerHTML = '';


  data.peserta.forEach(
    function(item) {

      const tr =
        document.createElement(
          'tr'
        );


      tr.innerHTML = `

        <td>
          ${item.no}
        </td>

        <td>
          ${escapeHtml(
            item.nama
          )}
        </td>

        ${item.juri.map(
          function(nilai) {

            return `
              <td>
                ${nilai > 0
                  ? formatNumber(nilai)
                  : '-'}
              </td>
            `;

          }
        ).join('')}

        <td>
          <strong>
            ${
              item.rataRata > 0
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


      tbody.appendChild(tr);

    }
  );
}


/* =====================================================
   JUARA
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
      result.message
    );
  }


  const container =
    document
      .getElementById(
        'winnerContainer'
      );


  container.innerHTML = '';


  Object.keys(
    result.data
  ).forEach(
    function(key) {

      const category =
        result.data[key];


      const section =
        document.createElement(
          'div'
        );


      section.className =
        'winner-section';


      let html = `

        <h3>
          ${escapeHtml(
            category.kategori
          )}
        </h3>

      `;


      category.juara
        .forEach(
          function(item) {

            let medal = '';

            if (item.juara === 1)
              medal = '🥇';

            else if (
              item.juara === 2
            )
              medal = '🥈';

            else if (
              item.juara === 3
            )
              medal = '🥉';


            html += `

              <div class="winner-row">

                <div class="winner-rank">
                  ${medal}
                  ${item.juara}
                </div>

                <div class="winner-name">
                  ${escapeHtml(
                    item.nama
                  )}
                </div>

                <div class="winner-score">
                  ${
                    item.rataRata > 0
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

  return Number(value)
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
   START
   ===================================================== */

document.addEventListener(
  'DOMContentLoaded',
  function() {

    restoreAdminSession();

  }
);
