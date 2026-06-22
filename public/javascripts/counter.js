document.querySelectorAll('.counter').forEach(counter => {
    const max = parseInt(counter.getAttribute('max'));
    const min = parseInt(counter.getAttribute('min'));
    const input = document.getElementById(counter.getAttribute('for'));

    counter.textContent = ``;

    input.addEventListener('input', () => {
        const len = input.value.length;
        counter.textContent = `${min? min + ' /' : ''} ${len} ${max ? '/ ' + max : ''}`;
        counter.classList.toggle('out-of-limits', len > max || len < min);
    });
});