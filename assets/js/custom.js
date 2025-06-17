// 카테고리 태그를 포스트 제목에 자동 추가하는 스크립트
document.addEventListener('DOMContentLoaded', function() {
    // Recent Posts 섹션의 포스트 제목들 처리
    const postTitles = document.querySelectorAll('.archive__item-title a, .list__item .archive__item-title a');
    
    postTitles.forEach(function(titleLink) {
        // URL에서 카테고리 추출 (예: /categories/database/oracle/install/...)
        const href = titleLink.getAttribute('href');
        if (href && href.includes('/categories/')) {
            const pathParts = href.split('/').filter(part => part !== ''); // 빈 문자열 제거
            const categoryIndex = pathParts.indexOf('categories');
            
            if (categoryIndex !== -1 && pathParts.length > categoryIndex + 2) {
                // categories 다음 세 번째 디렉토리 (oracle)
                let category = pathParts[categoryIndex + 2]; // categories/database/oracle <- 이 부분
                category = category.charAt(0).toUpperCase() + category.slice(1); // Oracle로 변환
                
                // 이미 태그가 있는지 확인
                if (!titleLink.querySelector('.category-tag')) {
                    // 카테고리 태그 생성
                    const categoryTag = document.createElement('span');
                    categoryTag.className = 'category-tag';
                    categoryTag.setAttribute('data-category', category);
                    categoryTag.textContent = category;
                    
                    // 제목 앞에 태그 추가
                    const originalText = titleLink.textContent;
                    titleLink.textContent = '';
                    titleLink.appendChild(categoryTag);
                    titleLink.appendChild(document.createTextNode(' ' + originalText));
                }
            }
        }
    });
    
    // 개별 포스트 페이지의 제목 처리
    const pageTitle = document.querySelector('.page__title');
    if (pageTitle && window.location.pathname.includes('/categories/')) {
        const pathParts = window.location.pathname.split('/').filter(part => part !== '');
        const categoryIndex = pathParts.indexOf('categories');
        
        if (categoryIndex !== -1 && pathParts.length > categoryIndex + 2) {
            let category = pathParts[categoryIndex + 2]; // categories/database/oracle <- 이 부분
            category = category.charAt(0).toUpperCase() + category.slice(1);
            
            // 이미 태그가 있는지 확인
            if (!pageTitle.querySelector('.category-tag')) {
                const categoryTag = document.createElement('span');
                categoryTag.className = 'category-tag';
                categoryTag.setAttribute('data-category', category);
                categoryTag.textContent = category;
                
                // 제목 앞에 태그 추가
                pageTitle.insertBefore(categoryTag, pageTitle.firstChild);
                pageTitle.insertBefore(document.createTextNode(' '), categoryTag.nextSibling);
            }
        }
    }
    
    // 포스트 메타데이터에서 카테고리 추출하는 대안 방법
    const taxonomyItems = document.querySelectorAll('.page__taxonomy-item');
    if (taxonomyItems.length > 0 && pageTitle && !pageTitle.querySelector('.category-tag')) {
        // 마지막 카테고리를 주 카테고리로 사용
        const lastCategory = taxonomyItems[taxonomyItems.length - 1];
        const categoryText = lastCategory.textContent.trim();
        
        const categoryTag = document.createElement('span');
        categoryTag.className = 'category-tag';
        categoryTag.setAttribute('data-category', categoryText);
        categoryTag.textContent = categoryText;
        
        pageTitle.insertBefore(categoryTag, pageTitle.firstChild);
        pageTitle.insertBefore(document.createTextNode(' '), categoryTag.nextSibling);
    }
});

// 페이지 로드 후에도 실행 (AJAX 로딩 대응)
window.addEventListener('load', function() {
    setTimeout(function() {
        // Recent Posts가 동적으로 로드되는 경우를 위한 재실행
        const event = new Event('DOMContentLoaded');
        document.dispatchEvent(event);
    }, 1000);
});
