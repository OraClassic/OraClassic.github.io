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
                    
                    // 카테고리별 아이콘 설정
                    let icon = getIconForCategory(category.toLowerCase());
                    categoryTag.innerHTML = icon + ' ' + category;
                    
                    // 제목 앞에 태그 추가
                    const originalText = titleLink.textContent;
                    titleLink.textContent = '';
                    titleLink.appendChild(categoryTag);
                    titleLink.appendChild(document.createTextNode(' ' + originalText));
                }
            }
        }
    });

// 카테고리별 아이콘을 반환하는 함수
function getIconForCategory(category) {
    const iconMap = {
        // 데이터베이스 DBMS
        'oracle': '🔴',        // Oracle 빨간 원
        'mysql': '🐬',         // MySQL 돌고래
        'postgresql': '🐘',    // PostgreSQL 코끼리
        'postgres': '🐘',      // PostgreSQL 축약
        'mongodb': '🍃',       // MongoDB 잎사귀
        'redis': '🗃️',        // Redis 데이터 저장소
        'sqlite': '🪶',       // SQLite 가벼운 깃털
        'mariadb': '🌊',      // MariaDB 바다
        'cassandra': '💍',     // Cassandra 보석
        'elasticsearch': '🔍', // Elasticsearch 검색
        'neo4j': '🕸️',        // Neo4j 그래프
        
        // 클라우드 서비스
        'aws': '☁️',          // AWS 클라우드
        'azure': '🌐',        // Azure 글로벌
        'gcp': '🚀',          // Google Cloud Platform
        'docker': '🐳',       // Docker 고래
        'kubernetes': '⛵',    // Kubernetes 항해
        'k8s': '⛵',          // Kubernetes 축약
        
        // 프로그래밍 언어
        'java': '☕',         // Java 커피
        'python': '<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" width="16" height="16" style="vertical-align: middle;">',       // Python 뱀
        'javascript': '🟨',   // JavaScript 노란색
        'js': '🟨',          // JavaScript 축약
        'typescript': '🔷',   // TypeScript 파란 다이아몬드
        'ts': '🔷',          // TypeScript 축약
        'go': '🐹',          // Go 고퍼
        'rust': '🦀',        // Rust 게
        'php': '🐘',         // PHP 코끼리
        'ruby': '💎',        // Ruby 보석
        'csharp': '🟦',      // C# 파란 사각형
        'cpp': '⚡',         // C++ 번개
        'c': '🔧',           // C 도구
        
        // 웹 기술
        'react': '⚛️',        // React 원자
        'vue': '💚',          // Vue.js 녹색 하트
        'angular': '🅰️',      // Angular A
        'nodejs': '💚',       // Node.js 녹색
        'node': '💚',         // Node.js 축약
        'express': '🚂',      // Express 기차
        'django': '🎸',       // Django 기타
        'flask': '🌶️',       // Flask 고추
        'spring': '🌱',       // Spring 새싹
        'laravel': '🎨',      // Laravel 팔레트
        
        // 운영체제
        'linux': '🐧',        // Linux 펭귄
        'ubuntu': '🟠',       // Ubuntu 주황색
        'centos': '💙',       // CentOS 파란색
        'redhat': '🔴',       // RedHat 빨간색
        'windows': '🪟',      // Windows 창문
        'macos': '🍎',        // macOS 사과
        'unix': '📟',         // Unix 터미널
        
        // 도구 및 기타
        'git': '📦',          // Git 패키지
        'github': '😺',       // GitHub 고양이
        'gitlab': '🦊',       // GitLab 여우
        'jenkins': '⚙️',      // Jenkins 기어
        'ansible': '🔧',      // Ansible 도구
        'terraform': '🏗️',    // Terraform 건설
        'nginx': '🔀',        // Nginx 로드밸런서
        'apache': '🪶',       // Apache 깃털
        'tomcat': '🐱',       // Tomcat 고양이
        'kafka': '📨',        // Kafka 메시지
        'spark': '⚡',        // Apache Spark 번개
        'hadoop': '🐘',       // Hadoop 코끼리
        
        // 설치/성능/보안 카테고리
        'install': '⚙️',      // 설치 기어
        'performance': '📊',   // 성능 차트
        'security': '🔒',     // 보안 자물쇠
        'monitoring': '📈',   // 모니터링 그래프
        'backup': '💾',       // 백업 디스크
        'migration': '🚚',    // 마이그레이션 트럭
        'troubleshooting': '🔧', // 문제해결 도구
        'optimization': '🚀', // 최적화 로켓
        'configuration': '⚙️', // 구성 기어
        'deployment': '🚀',   // 배포 로켓
    };
    
    return iconMap[category] || '📁'; // 기본 아이콘
}
    
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
                
                // 카테고리별 아이콘 설정
                let icon = getIconForCategory(category.toLowerCase());
                categoryTag.innerHTML = icon + ' ' + category;
                
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
        
        // 카테고리별 아이콘 설정
        let icon = getIconForCategory(categoryText.toLowerCase());
        categoryTag.innerHTML = icon + ' ' + categoryText;
        
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
