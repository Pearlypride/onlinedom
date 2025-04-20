document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('complaintForm');
    const voteForm = document.getElementById('voteForm');
    const voteResults = document.getElementById('voteResults');
    const list = document.getElementById('complaintsList');
    const filterCategory = document.getElementById('filterCategory');
    const filterStatus = document.getElementById('filterStatus');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminBtn = document.getElementById('adminBtn');
    const builderBtn = document.getElementById('builderBtn');
  
    // Проверка авторизации
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.name) {
      loginBtn.classList.add('hidden');
      logoutBtn.classList.remove('hidden');
      if (user.role === 'ksk') adminBtn.classList.remove('hidden');
      if (user.role === 'builder') builderBtn.classList.remove('hidden');
    }
  
    // Переход на страницу логина
    loginBtn.addEventListener('click', () => {
      window.location.href = 'login.html';
    });
  
    // Анимации с GSAP
    gsap.from('.animate-slideIn', {
      opacity: 0,
      y: 20,
      duration: 0.5,
      stagger: 0.1,
    });
  
    // Загрузка жалоб
    async function loadComplaints() {
      try {
        const category = filterCategory.value;
        const status = filterStatus.value;
        const res = await fetch(`http://localhost:3000/api/complaints?category=${category}&status=${status}`);
        if (!res.ok) throw new Error('Ошибка загрузки жалоб');
        const data = await res.json();
        list.innerHTML = data.map((c, index) => `
          <li class="glass-effect p-4 rounded-lg animate-slideIn hover:shadow-lg" style="animation-delay: ${0.1 * index}s;">
            <strong class="text-blue-400">${c.name}</strong> 
            <span class="text-gray-400">(${c.apartment})</span> 
            <span class="text-purple-400">[${c.category}]</span>
            <span class="text-green-400">[${c.status}]</span>:<br>
            <p class="text-gray-200 mt-1">${c.message}</p>
            ${c.image ? `<img src="/uploads/${c.image}" alt="Жалоба" class="mt-2 max-w-full h-auto rounded-lg">` : ''}
          </li>
        `).join('');
      } catch (error) {
        list.innerHTML = `<li class="text-red-400 p-4">Ошибка: ${error.message}</li>`;
      }
    }
  
    // Отправка жалобы
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!user.name) return alert('Пожалуйста, войдите в систему');
      
      const submitButton = form.querySelector('button');
      submitButton.disabled = true;
      submitButton.textContent = 'Отправка...';
  
      const formData = new FormData();
      formData.append('name', form.name.value);
      formData.append('apartment', form.apartment.value);
      formData.append('message', form.message.value);
      formData.append('category', form.category.value);
      if (form.image.files[0]) formData.append('image', form.image.files[0]);
  
      try {
        const res = await fetch('http://localhost:3000/api/complaints', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Ошибка отправки жалобы');
        form.reset();
        await loadComplaints();
      } catch (error) {
        alert(`Ошибка: ${error.message}`);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Отправить жалобу';
      }
    });
  
    // Голосование
    async function loadVoteResults() {
      try {
        const res = await fetch('http://localhost:3000/api/votes');
        if (!res.ok) throw new Error('Ошибка загрузки результатов');
        const data = await res.json();
        voteResults.innerHTML = `
          <p>Да: ${data.yes} голосов</p>
          <p>Нет: ${data.no} голосов</p>
        `;
      } catch (error) {
        voteResults.innerHTML = `<p class="text-red-400">Ошибка: ${error.message}</p>`;
      }
    }
  
    voteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!user.name) return alert('Пожалуйста, войдите в систему');
      
      const vote = voteForm.vote.value;
      try {
        const res = await fetch('http://localhost:3000/api/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote, user: user.name }),
        });
        if (!res.ok) throw new Error('Ошибка голосования');
        await loadVoteResults();
      } catch (error) {
        alert(`Ошибка: ${error.message}`);
      }
    });
  
    // Фильтрация
    filterCategory.addEventListener('change', loadComplaints);
    filterStatus.addEventListener('change', loadComplaints);
  
    // Выход
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('user');
      window.location.reload();
    });
  
    // Загрузка данных
    loadComplaints();
    loadVoteResults();
  });