// IIFE to encapsulate the script and avoid polluting the global scope
(function() {
    'use strict';

    // --- CONFIGURATION ---
    const POSTS_PER_PAGE = 10;
    const POSTS_MANIFEST_URL = '/posts/posts.json'; // The heart of our "dynamic" static site

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
        document.body.classList.add('loaded'); // Trigger fade-in animation

        // Page-specific setup
        if (postListEl) {
            await initIndexPage();
        } else if (postContentEl) {
            await initPostPage();
        }
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
            if (loaderEl) loaderEl.innerHTML = `<p class="accent-text-amber">Error: Could not load post index. Please check the console.</p>`;
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
            const response = await fetch(`/posts/${postSlug}.md`);
            if (!response.ok) throw new Error(`Post not found: ${postSlug}`);
            
            const markdown = await response.text();
            
            // Use marked.js to convert markdown to HTML
            const contentHtml = marked.parse(markdown);

            // Create a temporary div to parse the HTML and extract info
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentHtml;

            const postTitle = tempDiv.querySelector('h1')?.textContent || 'Untitled Post';
            const postExcerpt = tempDiv.querySelector('p')?.textContent.substring(0, 150) + '...' || 'No excerpt available.';

            // Update SEO and meta tags
            updateSEOTags(postTitle, postExcerpt, window.location.href);

            postContentEl.innerHTML = contentHtml;
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
        loaderEl?.remove(); // Remove loader once we start rendering

        const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
        
        if (filteredPosts.length === 0) {
            noResultsEl.style.display = 'block';
            paginationControlsEl.style.display = 'none';
            return;
        }
        
        noResultsEl.style.display = 'none';
        paginationControlsEl.style.display = 'flex';

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
     * @returns {HTMLElement} The created article element.
     */
    function createPostElement(post) {
        const article = document.createElement('article');
        article.className = 'hacker-terminal p-6 transition-all duration-300 hover:border-accent-green hover:shadow-lg hover:shadow-green-500/10';
        
        const formattedDate = new Date(post.date).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

        article.innerHTML = `
            <header>
                <time datetime="${post.date}" class="text-xs accent-text-amber tracking-widest">${formattedDate}</time>
                <h2 class="mt-2 text-2xl font-bold accent-text-green">
                    <a href="/post.html?slug=${post.slug}" class="hover:underline">${post.title}</a>
                </h2>
            </header>
            <p class="mt-4 text-gray-400 text-sm leading-relaxed">${post.excerpt}</p>
            <a href="/post.html?slug=${post.slug}" class="inline-block mt-4 text-sm font-semibold accent-text-amber hover:accent-text-green transition-colors">read_more &gt;</a>
        `;
        return article;
    }

    /**
     * Updates the state and appearance of pagination buttons.
     * @param {number} totalPages - The total number of pages.
     */
    function updatePaginationControls(totalPages) {
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
        document.title = `${title} | Cyber Journal`;
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
        searchBarEl.addEventListener('input', handleSearch);
        prevPageBtn.addEventListener('click', handlePrevPage);
        nextPageBtn.addEventListener('click', handleNextPage);
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
    
    // --- INITIALIZATION ---
    // Run the main initializer function when the DOM is fully loaded.
    document.addEventListener('DOMContentLoaded', init);

})();
