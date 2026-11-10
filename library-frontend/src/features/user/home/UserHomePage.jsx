
import { useEffect, useState } from 'react';
import { getBooks } from '../../../services/bookService';
import './UserHomePage.css';

function formatAuthors(book) {
    return (
        book.authorName ||
        book.author ||
        book.authors ||
        'Đang cập nhật tác giả'
    );
}

function getBookTitle(book) {
    return book.title || book.name || 'Chưa có tên sách';
}

function getBookId(book) {
    return book.id ?? book.bookId;
}

export default function UserHomePage({
    navigate,
    isLoggedIn = false,
}) {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function loadFeaturedBooks() {
            setLoading(true);
            setError('');

            try {
                const result = await getBooks(0, '');

                if (cancelled) return;

                setBooks((result.books || []).slice(0, 8));
            } catch (err) {
                if (cancelled) return;

                setError(
                    err.message ||
                    'Không thể tải danh sách sách lúc này.'
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadFeaturedBooks();

        return () => {
            cancelled = true;
        };
    }, []);

    function goTo(path) {
        if (typeof navigate === 'function') {
            navigate(path);
        }
    }

    function handleSearch(event) {
        event.preventDefault();

        const params = new URLSearchParams();

        if (keyword.trim()) {
            params.set('keyword', keyword.trim());
        }

        const query = params.toString();

        goTo(query ? `/books?${query}` : '/books');
    }

    return (
        <div className="user-home">
            <section className="user-hero">
                <div className="user-hero-decoration user-hero-decoration-one" />
                <div className="user-hero-decoration user-hero-decoration-two" />

                <div className="user-home-container user-hero-inner">
                    <div className="user-hero-copy">
                        <span className="user-eyebrow">
                            KHÔNG GIAN TRI THỨC CỦA BẠN
                        </span>

                        <h1>
                            Mỗi cuốn sách
                            <br />
                            <span>mở ra một thế giới.</span>
                        </h1>

                        <p>
                            Khám phá những cuốn sách thú vị, tìm kiếm
                            tri thức mới và theo dõi hành trình đọc
                            của bạn tại một nơi duy nhất.
                        </p>

                        <form
                            className="user-hero-search"
                            onSubmit={handleSearch}
                        >
                            <span
                                className="user-search-icon"
                                aria-hidden="true"
                            >
                                ⌕
                            </span>

                            <input
                                type="search"
                                value={keyword}
                                onChange={event =>
                                    setKeyword(event.target.value)
                                }
                                placeholder="Tìm tên sách, tác giả..."
                                aria-label="Tìm sách"
                            />

                            <button type="submit">
                                Tìm sách
                            </button>
                        </form>

                        <div className="user-hero-actions">
                            <button
                                type="button"
                                className="user-primary-action"
                                onClick={() => goTo('/books')}
                            >
                                Khám phá thư viện
                                <span aria-hidden="true">→</span>
                            </button>

                            <button
                                type="button"
                                className="user-secondary-action"
                                onClick={() =>
                                    goTo(
                                        isLoggedIn
                                            ? '/my-books'
                                            : '/login'
                                    )
                                }
                            >
                                {isLoggedIn
                                    ? 'Sách của tôi'
                                    : 'Đăng nhập'}
                            </button>
                        </div>
                    </div>

                    <div
                        className="user-hero-art"
                        aria-hidden="true"
                    >
                        <div className="user-hero-orbit user-hero-orbit-one" />
                        <div className="user-hero-orbit user-hero-orbit-two" />

                        <div className="user-hero-book user-hero-book-back">
                            <div className="user-book-cover-lines" />
                        </div>

                        <div className="user-hero-book user-hero-book-middle">
                            <div className="user-book-cover-lines" />
                        </div>

                        <div className="user-hero-book user-hero-book-front">
                            <span className="user-book-cover-mark">B</span>
                            <span className="user-book-cover-title">
                                THE
                                <br />
                                WORLD
                                <br />
                                OF IDEAS
                            </span>
                            <span className="user-book-cover-subtitle">
                                DISCOVER SOMETHING NEW
                            </span>
                        </div>

                        <div className="user-hero-floating-card">
                            <span>✦</span>
                            <div>
                                <strong>Khám phá mỗi ngày</strong>
                                <small>Tri thức không giới hạn</small>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="user-home-container user-home-benefits">
                <article className="user-benefit">
                    <span className="user-benefit-icon">⌕</span>
                    <div>
                        <strong>Tìm kiếm dễ dàng</strong>
                        <p>Nhanh chóng tìm cuốn sách bạn cần.</p>
                    </div>
                </article>

                <article className="user-benefit">
                    <span className="user-benefit-icon">▤</span>
                    <div>
                        <strong>Khám phá đa dạng</strong>
                        <p>Tìm hiểu các đầu sách trong thư viện.</p>
                    </div>
                </article>

                <article className="user-benefit">
                    <span className="user-benefit-icon">◷</span>
                    <div>
                        <strong>Theo dõi mượn trả</strong>
                        <p>Quản lý thời hạn và lịch sử của bạn.</p>
                    </div>
                </article>
            </section>

            <section className="user-home-container user-featured-section">
                <div className="user-section-heading">
                    <div>
                        <span className="user-eyebrow">
                            DÀNH CHO BẠN
                        </span>

                        <h2>Khám phá sách</h2>

                        <p>
                            Một vài đầu sách từ bộ sưu tập thư viện.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="user-view-all"
                        onClick={() => goTo('/books')}
                    >
                        Xem tất cả
                        <span aria-hidden="true">→</span>
                    </button>
                </div>

                {loading ? (
                    <div className="user-books-message">
                        <span className="user-loading-indicator" />
                        Đang tải danh sách sách...
                    </div>
                ) : error ? (
                    <div className="user-books-message user-books-error">
                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={() => goTo('/books')}
                        >
                            Mở danh sách sách
                        </button>
                    </div>
                ) : books.length === 0 ? (
                    <div className="user-books-message">
                        Chưa có sách để hiển thị.
                    </div>
                ) : (
                    <div className="user-featured-grid">
                        {books.map((book, index) => {
                            const id = getBookId(book);

                            return (
                                <article
                                    className="user-book-card"
                                    key={id ?? index}
                                >
                                    <button
                                        type="button"
                                        className="user-book-cover"
                                        onClick={() =>
                                            id != null &&
                                            goTo(`/books/${id}`)
                                        }
                                        disabled={id == null}
                                        aria-label={`Xem ${getBookTitle(book)}`}
                                    >
                                        {book.coverUrl ||
                                        book.coverImageUrl ||
                                        book.imageUrl ? (
                                            <img
                                                src={
                                                    book.coverUrl ||
                                                    book.coverImageUrl ||
                                                    book.imageUrl
                                                }
                                                alt={`Bìa ${getBookTitle(book)}`}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div
                                                className={`user-book-placeholder palette-${index % 4}`}
                                            >
                                                <span className="user-placeholder-symbol">
                                                    ❝
                                                </span>

                                                <strong>
                                                    {getBookTitle(book)}
                                                </strong>

                                                <small>BOOKSPACE LIBRARY</small>
                                            </div>
                                        )}
                                    </button>

                                    <div className="user-book-card-info">
                                        <span className="user-book-category">
                                            {book.categoryName ||
                                                book.category?.name ||
                                                'SÁCH THƯ VIỆN'}
                                        </span>

                                        <h3>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    id != null &&
                                                    goTo(`/books/${id}`)
                                                }
                                                disabled={id == null}
                                            >
                                                {getBookTitle(book)}
                                            </button>
                                        </h3>

                                        <p>
                                            {formatAuthors(book)}
                                        </p>

                                        <button
                                            type="button"
                                            className="user-book-detail-link"
                                            disabled={id == null}
                                            onClick={() =>
                                                goTo(`/books/${id}`)
                                            }
                                        >
                                            Xem chi tiết
                                            <span aria-hidden="true">→</span>
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="user-reading-banner">
                <div className="user-home-container user-reading-banner-inner">
                    <div>
                        <span className="user-eyebrow">
                            HÀNH TRÌNH ĐỌC CỦA BẠN
                        </span>

                        <h2>
                            Một chút tri thức mỗi ngày,
                            <br />
                            một bước tiến mỗi ngày.
                        </h2>

                        <p>
                            Khám phá sách và theo dõi những cuốn bạn
                            đang mượn tại thư viện.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            goTo(isLoggedIn ? '/my-books' : '/login')
                        }
                    >
                        {isLoggedIn
                            ? 'Xem sách của tôi'
                            : 'Bắt đầu ngay'}
                        <span aria-hidden="true">→</span>
                    </button>
                </div>
            </section>
        </div>
    );
}
