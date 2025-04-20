self.addEventListener('push', (event) => {
    const data = event.data.json();
    self.registration.showNotification('Облачный ЖКХ', {
      body: data.message,
      icon: '/assets/icon.png',
    });
  });