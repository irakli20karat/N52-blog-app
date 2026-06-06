const burgerMenuBtn = document.querySelector('.burger-menu-icon-wrapper')
const burgerMenu = document.querySelector('.nav-wrapper-mobile')
const closeBurgerMenuBtn = document.querySelector('.close-btn-wrapper')

burgerMenuBtn.addEventListener('click', () => {
    burgerMenu.classList.add("opened");
})

closeBurgerMenuBtn.addEventListener('click', () => {
    burgerMenu.classList.remove("opened");
})
