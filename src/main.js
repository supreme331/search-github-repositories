'use strict';

const store = {
    repositories: {
        items: [],
        total_count: null,
    },
    url: null,
}

const searchForm = document.forms.search;
const repositoriesListElem = document.getElementById('repositories');
const searchTermInput = document.getElementById('searchTerm');
const loadNextPortionBtn = document.getElementById('load-next');
const loaderElem = document.querySelector('.loader');
const repositoriesTitle = document.querySelector('.repositories__title').firstElementChild;
const nothingFoundElem = document.querySelector('.empty');

// Событие отправки формы
searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    let searchTerm = searchForm.searchTerm.value;
    const language = searchForm.language.value;
    const perPage = searchForm.perPage.value;
    const sortBy = searchForm.sortBy.value;

    if (searchTerm.length < 2) {
        showValidationMessage(searchTermInput, 'Минимальная длина поискового запроса 2 символа');
        return;
    }

    loaderElem.style.top = document.documentElement.clientHeight / 2 + 'px';
    loaderElem.style.display = 'block';
    store.repositories.items = [];
    repositoriesListElem.innerHTML = '';
    loadNextPortionBtn.style.display = 'none';

    searchTerm = language === 'none' ? searchTerm : searchTerm + `+language:${language}`;

    let url = new URL('https://api.github.com/search/repositories');

    url.searchParams.append('q', searchTerm);
    url.searchParams.set('sort', sortBy);
    url.searchParams.set('order', 'desc');
    url.searchParams.set('page', '1');
    url.searchParams.set('per_page', perPage);

    store.url = url;

    fetchRepositories(url).then(() => renderRepositories());
})

// Слушатель изменения полей ввода
searchForm.addEventListener('input', function (e) {
    // Событие удаления сообщения об ошибке валидации текстового поля
    if (e.target.id === 'searchTerm' && e.target.classList.contains('error')) {
        removeValidationMessage(searchTermInput);
    }
})

// Слушатель кнопки подгрузки репозиториев
loadNextPortionBtn.addEventListener('click', () => loadNextRepositoriesPortion());

// Получение репозиториев
async function fetchRepositories(url) {
    try {
        const response = await fetch(url);
        const result = await response.json();

        if (result.message === 'Not Found') {
            throw new Error('Не удалось загрузить репозитории');
        }

        store.repositories.items = [...store.repositories.items, ...result.items];
        store.repositories.total_count = result.total_count;
    } catch (e) {
        showError(e);
    }

}

// Отрисовка репозиториев в DOM
function renderRepositories() {
    repositoriesListElem.innerHTML = '';
    nothingFoundElem.style.display = 'none';

    const title = composeTitle(store.repositories.total_count);

    // Не найдено ни одного репозитория
    if (!store.repositories.items.length) {
        loaderElem.style.display = 'none';
        repositoriesTitle.textContent = title;
        nothingFoundElem.style.display = 'block';

        return;
    }

    // Добавление элементов репозиториев в DOM
    store.repositories.items.forEach(item => {
        loaderElem.style.display = 'none';
        repositoriesTitle.textContent = title;
        repositoriesListElem.append(createRepositoryItemElement(item));
    })

    loadNextPortionBtn.style.display = 'flex';
}

// Функция создания элемента репозитория
function createRepositoryItemElement(item) {
    const repositoryElem = document.createElement('li');

    repositoryElem.innerHTML = `
    <a href=${item.html_url} target="_blank">${item.name}</a>
    <div><span>Логин владельца:</span> ${item.owner.login}</div>    
    <div><span>Описание:</span> ${item.description ? item.description : 'не указано'}</div>    
    <div><img src="./img/star.png" alt="stars"> ${item.stargazers_count}</div>
    <div><span>Язык:</span> ${item.language ? item.language : 'не указан'}</div>
    <div>Обновлен ${(new Date(item.updated_at).toLocaleDateString())}</div>`

    return repositoryElem;
}

// Функция вывода сообщения об ошибке
function showError(e) {
    const errorElem = document.createElement('div');

    errorElem.classList.add('error-message');
    errorElem.textContent = e.message;
    loaderElem.style.display = 'none';
    document.body.append(errorElem);

    const errorElemMetrics = errorElem.getBoundingClientRect();

    errorElem.style.top = document.documentElement.clientHeight / 2 + 'px';
    errorElem.style.left = document.documentElement.clientWidth / 2 - errorElemMetrics.width / 2 + 'px';
}

// Функция вывода сообщения об ошибке валидации
function showValidationMessage(element, messageText) {
    if (element.classList.contains('error')) return;

    const messageElem = document.createElement('div');
    messageElem.textContent = messageText;
    messageElem.className = 'error-message';
    element.classList.add('error');
    element.after(messageElem);
}

// Функция удаления сообщения об ошибке валидации
function removeValidationMessage(element) {
    element.nextElementSibling?.remove();
    element.classList.remove('error');
}

// Загрузка следующей партии репозиториев
function loadNextRepositoriesPortion() {
    loaderElem.style.top = document.documentElement.clientHeight / 2 + 'px';
    loaderElem.style.display = 'block';

    const nextPage = (+store.url.searchParams.get('page') + 1).toString();
    store.url.searchParams.set('page', nextPage);
    fetchRepositories(store.url).then(() => renderRepositories());
}

// Генерация заголовка с общим количеством репозиториев
function composeTitle(totalCount) {
    const totalCountSplit = totalCount?.toString().split('');

    if (!totalCountSplit) return;

    // 11 - 19
    if (totalCountSplit[totalCountSplit.length - 2] === '1') {
        if (+(totalCountSplit[totalCountSplit.length - 1]) > 0) {
            return `Всего найдено ${totalCount} репозиториев`;
        }
    }

    // Последняя единица
    if (totalCountSplit[totalCountSplit.length - 1] === '1') {
        return `Всего найдено ${totalCount} репозиторий`;
    }

    // Последняя цифра от 2 до 4
    if (+(totalCountSplit[totalCountSplit.length - 1]) > 1
        && +(totalCountSplit[totalCountSplit.length - 1]) < 5) {
        return `Всего найдено ${totalCount} репозитория`;
    }

    // Последняя цифра больше 5 или 0
    if (+(totalCountSplit[totalCountSplit.length - 1]) >= 5
        || totalCountSplit[totalCountSplit.length - 1] === '0') {
        return totalCount === 0 ? 'Ничего не найдено' : `Всего найдено ${totalCount} репозиториев`;
    }
}