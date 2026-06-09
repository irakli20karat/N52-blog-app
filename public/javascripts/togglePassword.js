const toggleButtons = document.querySelectorAll('.togglePasswordButton')

toggleButtons.forEach(t => t.addEventListener('click', () => {
    const passwordFields = document.querySelectorAll('input.password');

    const toggleShow = passwordFields[0].type === 'password' ? true : false

    toggleButtons.forEach(t => {
        const img = t.querySelector('img');
        if (img) {
            img.src = toggleShow ? 'images/eye-slash-icon.svg' : 'images/eye-icon.svg';
        }
    })

    passwordFields.forEach(f => {
        f.type = toggleShow ? 'text' : 'password';
    })
}))