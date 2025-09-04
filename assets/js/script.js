// IIFE to encapsulate the script and avoid polluting the global scope
(function() {
    'use strict';

    // --- CONFIGURATION ---
    const POSTS_PER_PAGE = 10;
    const POSTS_MANIFEST_URL = './posts/posts.json'; // The heart of our "dynamic" static site

    // --- STATE ---
    let allPosts = [];
    let filteredPosts = [];
    let currentPage = 1;

    // --- DOM ELEMENTS ---
    const postListEl = document.getElementById('post-list');
    const searchBarEl = document.getElementById('search-bar');
    const paginationControlsEl = document.getElementById('pagination-controls');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageIndicatorEl = document.getElementById('page-indicator');
    const postContentEl = document.getElementById('post-content');
    const loaderEl = document.getElementById('loader');
    const noResultsEl = document.getElementById('no-results');

    // --- CORE LOGIC ---

    /**
     * Main initializer function. Determines which page we're on and runs the appropriate logic.
     */
    async function init() {
        // Common setup for all pages
        setupCopyrightYear();

        // Page-specific setup
        if (postContentEl) { // This is a post page
            await initPostPage();
        } else if (postListEl) { // This is the index page
            await initIndexPage();
            setupIndexPageAnimations();
        }
        
        // Trigger fade-in for the body on all pages
        document.body.classList.add('loaded');
    }
    
    /**
     * Fetches and initializes the homepage (post list, search, pagination).
     */
    async function initIndexPage() {
        try {
            const response = await fetch(POSTS_MANIFEST_URL);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            // Sort posts by date, newest first
            allPosts = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            filteredPosts = [...allPosts];

            setupEventListeners();
            renderPage();
        } catch (error) {
            console.error("Error fetching or parsing posts manifest:", error);
            if (loaderEl) loaderEl.innerHTML = `<p class="text-yellow-500">Error: Could not load post index. Please check the console.</p>`;
        }
    }

    /**
     * Fetches and renders a single blog post.
     */
    async function initPostPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const postSlug = urlParams.get('slug');

        if (!postSlug) {
            postContentEl.innerHTML = `<p class="accent-text-amber">Error: No post specified.</p>`;
            return;
        }

        try {
            const response = await fetch(`./posts/${postSlug}.md`);
            if (!response.ok) throw new Error(`Post not found: ${postSlug}`);
            
            const markdown = await response.text();
            
            // Use marked.js to convert markdown to HTML
            const contentHtml = marked.parse(markdown);

            // Create a temporary div to parse the HTML and extract info
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentHtml;

            const postTitle = tempDiv.querySelector('h1')?.textContent || 'Untitled Post';
            const postExcerpt = tempDiv.querySelector('p')?.textContent.substring(0, 160) + '...' || 'No excerpt available.';

            // Update SEO and meta tags
            updateSEOTags(postTitle, postExcerpt, window.location.href);

            postContentEl.innerHTML = contentHtml;

            // After inserting content, find all <pre><code> blocks and highlight them
            postContentEl.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });

        } catch (error) {
            console.error("Error fetching post:", error);
            updateSEOTags("Error", "Could not load the post.", window.location.href);
            postContentEl.innerHTML = `<p class="accent-text-amber">Fatal Error: Transmission lost. Could not load post content.</p>`;
        }
    }

    // --- RENDERING & UI ---

    /**
     * Renders the current page of posts and updates pagination controls.
     */
    function renderPage() {
        if (!postListEl || !paginationControlsEl) return;
        
        postListEl.innerHTML = ''; // Clear previous posts
        if (loaderEl) loaderEl.style.display = 'none';

        const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
        
        if (filteredPosts.length === 0) {
            if (noResultsEl) noResultsEl.style.display = 'block';
            paginationControlsEl.style.display = 'none';
            return;
        }
        
        if (noResultsEl) noResultsEl.style.display = 'none';
        if (totalPages > 1) {
            paginationControlsEl.style.display = 'flex';
        } else {
            paginationControlsEl.style.display = 'none';
        }


        const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
        const endIndex = startIndex + POSTS_PER_PAGE;
        const postsToRender = filteredPosts.slice(startIndex, endIndex);

        const fragment = document.createDocumentFragment();
        postsToRender.forEach(post => {
            const postElement = createPostElement(post);
            fragment.appendChild(postElement);
        });
        postListEl.appendChild(fragment);

        updatePaginationControls(totalPages);
    }

    /**
     * Creates the HTML element for a single post preview on the homepage.
     * @param {object} post - The post object from the manifest.
     * @returns {HTMLElement} The created anchor element.
     */
    function createPostElement(post) {
        // The entire card is a link now
        const link = document.createElement('a');
        link.href = `./post.html?slug=${post.slug}`;
        link.className = 'block slide-up post-card card-hover group';
        
        const formattedDate = new Date(post.date).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

        link.innerHTML = `
            <header>
                <div class="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <span class="font-mono">${formattedDate}</span>
                </div>
                <h2 class="mt-2 text-xl sm:text-2xl font-bold text-white transition-colors group-hover:text-cyan-400">
                   ${post.title}
                </h2>
            </header>
            <p class="mt-4 text-gray-300 leading-relaxed">${post.excerpt}</p>
            <div class="mt-6 flex items-center justify-end">
                 <span class="text-cyan-400 transition-colors font-medium group-hover:underline">
                    Read more →
                </span>
            </div>
        `;
        return link;
    }


    /**
     * Updates the state and appearance of pagination buttons.
     * @param {number} totalPages - The total number of pages.
     */
    function updatePaginationControls(totalPages) {
        if (!pageIndicatorEl || !prevPageBtn || !nextPageBtn) return;
        pageIndicatorEl.textContent = `Page ${currentPage} of ${totalPages}`;
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
    }

    /**
     * Updates the document's title and meta tags for SEO.
     * @param {string} title - The new title.
     * @param {string} description - The new meta description.
     * @param {string} url - The canonical URL for the page.
     */
    function updateSEOTags(title, description, url) {
        document.title = `${title} | Hulo's Journal`;
        document.querySelector('meta[name="description"]')?.setAttribute('content', description);
        document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
        document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
        document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
        document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
    }
    
    // --- EVENT HANDLERS ---
    
    /**
     * Sets up all event listeners for the index page.
     */
    function setupEventListeners() {
        if (searchBarEl) searchBarEl.addEventListener('input', handleSearch);
        if (prevPageBtn) prevPageBtn.addEventListener('click', handlePrevPage);
        if (nextPageBtn) nextPageBtn.addEventListener('click', handleNextPage);
    }

    /**
     * Handles the search input, filters posts, and re-renders.
     * @param {Event} e - The input event.
     */
    function handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        filteredPosts = allPosts.filter(post => 
            post.title.toLowerCase().includes(searchTerm) ||
            post.excerpt.toLowerCase().includes(searchTerm)
        );
        currentPage = 1; // Reset to first page on new search
        renderPage();
    }

    /**
     * Navigates to the previous page.
     */
    function handlePrevPage() {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
            window.scrollTo(0, 0);
        }
    }
    
    /**
     * Navigates to the next page.
     */
    function handleNextPage() {
        const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderPage();
            window.scrollTo(0, 0);
        }
    }
    
    // --- UTILITIES ---

    /**
     * Sets the copyright year in the footer.
     */
    function setupCopyrightYear() {
        const yearEl = document.getElementById('copyright-year');
        if (yearEl) {
            yearEl.textContent = new Date().getFullYear();
        }
    }

    /**
     * Sets up IntersectionObserver for scroll animations on the index page.
     */
    function setupIndexPageAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all elements with animation classes
        document.querySelectorAll('.slide-up, .fade-in').forEach(el => {
            observer.observe(el);
        });
    }
    
    // --- INITIALIZATION ---
    // Run the main initializer function when the DOM is ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

