const commentList = document.getElementById("comment-list");
const userId = serverData.userId;
const blog = serverData.blog;

const setEditing = (commentId, editing) => {
    const form = document.getElementById(`edit-form-${commentId}`);
    const content = document.getElementById(`content-${commentId}`);
    if (!form) return;

    form.classList.toggle('open', editing);
    if (content) content.classList.toggle('editing', editing);

    if (editing) {
        const textarea = form.querySelector('textarea');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
};

const postForm = async (form) => {
    await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form))
    });
    await fillComments();
};

commentList.addEventListener('click', (event) => {
    const replyBtn = event.target.closest('.comment-reply');
    if (replyBtn) {
        const form = document.getElementById(`reply-form-${replyBtn.dataset.commentId}`);
        if (!form) return;
        form.classList.toggle('open');
        if (form.classList.contains('open')) form.querySelector('textarea').focus();
        return;
    }

    const replyCancel = event.target.closest('.reply-cancel');
    if (replyCancel) {
        const form = document.getElementById(`reply-form-${replyCancel.dataset.commentId}`);
        if (!form) return;
        form.classList.remove('open');
        form.reset();
        return;
    }

    const editBtn = event.target.closest('.comment-edit');
    if (editBtn) {
        const form = document.getElementById(`edit-form-${editBtn.dataset.commentId}`);
        if (!form) return;
        setEditing(editBtn.dataset.commentId, !form.classList.contains('open'));
        return;
    }

    const editCancel = event.target.closest('.edit-cancel');
    if (editCancel) {
        const form = document.getElementById(`edit-form-${editCancel.dataset.commentId}`);
        if (form) form.reset();
        setEditing(editCancel.dataset.commentId, false);
        return;
    }
});

commentList.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;

    if (form.classList.contains('delete-form')) {
        if (!confirm('Delete this comment? This cannot be undone.')) return;
    }

    await postForm(form);
});

document.getElementById('main-comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await postForm(e.target);
    e.target.reset();
});

// ----- comments

const fillComments = async () => {
    const formatShortDate = (d) => new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
    const displayName = (user) => user && user.email ? user.email.split('@')[0] : 'Unknown';
    const initial = (user) => displayName(user).charAt(0).toUpperCase();
    const reactionCount = (reactions) => reactions ? reactions.length : 0;
    const hasReacted = (reactions) => !!(userId && reactions && reactions.some((r) => String(r.author) === userId));
    const isOwner = (author) => !!(userId && author && String(author._id) === userId);
    const isBlogAuthor = isOwner(blog.author);

    commentList.innerHTML = "";

    const response = await fetch(`/blogs/${blog._id}/comments`);
    const { comments } = await response.json();

    let commentBody = '';

    if (!comments || comments.length === 0) {
        commentBody = `<p class="no-comments">No comments yet. Be the first to share your thoughts.</p>`;
    } else {
        comments.forEach(comment => {
            const repliesHTML = comment.replies && comment.replies.length > 0
                ? `<div class="reply-list">
                    ${comment.replies.map(reply => `
                        <div>
                            <div class="comment reply">
                                <div class="comment-avatar">${initial(reply.author)}</div>
                                <div class="comment-body">
                                    <div class="comment-head">
                                        <div>
                                            <p class="comment-author">${displayName(reply.author)}</p>
                                            <p class="comment-date">
                                                ${formatShortDate(reply.date)}
                                                ${reply.editedAt ? `<span class="comment-edited">· edited (${formatShortDate(reply.editedAt)})</span>` : ''}
                                            </p>
                                        </div>
                                        <div class="reactions">
                                            <form class="reaction-form" action="/blogs/${blog._id}/comments/${comment._id}/replies/${reply._id}/like" method="POST">
                                                <button type="submit" class="reaction-btn ${hasReacted(reply.likes) ? 'liked' : ''}">
                                                    <img src="${hasReacted(reply.likes) ? '/images/thumbs-up-bold.svg' : '/images/thumbs-up.svg'}">
                                                </button>
                                            </form>
                                            <div class="likes-count">
                                                <p>${reactionCount(reply.likes) - reactionCount(reply.dislikes)}</p>
                                            </div>
                                            <form class="reaction-form" action="/blogs/${blog._id}/comments/${comment._id}/replies/${reply._id}/dislike" method="POST">
                                                <button type="submit" class="reaction-btn ${hasReacted(reply.dislikes) ? 'disliked' : ''}">
                                                    <img src="${hasReacted(reply.dislikes) ? '/images/thumbs-down-bold.svg' : '/images/thumbs-down.svg'}">
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                    <p class="comment-content" id="content-${reply._id}">${reply.content}</p>

                                    ${isOwner(reply.author) ? `
                                        <form class="edit-form" id="edit-form-${reply._id}"
                                            action="/blogs/${blog._id}/comments/${comment._id}/replies/${reply._id}/edit" method="POST">
                                            <textarea name="content" required>${reply.content}</textarea>
                                            <div class="edit-form-actions">
                                                <button type="submit" class="edit-submit">Save</button>
                                                <button type="button" class="edit-cancel" data-comment-id="${reply._id}">Cancel</button>
                                            </div>
                                        </form>` : ''}

                                    <div class="comment-actions">
                                        ${isOwner(reply.author) ? `<button type="button" class="comment-edit" data-comment-id="${reply._id}">Edit</button>` : ''}
                                        ${isOwner(reply.author) || isBlogAuthor ? `
                                            <form class="delete-form" action="/blogs/${blog._id}/comments/${comment._id}/replies/${reply._id}/delete" method="POST">
                                                <button type="submit" class="comment-delete">Delete</button>
                                            </form>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>`
                    ).join('')}
                </div>`
                : '';

            commentBody += `
                <div class="comment" id="comment-${comment._id}">
                    <div class="comment-avatar">${initial(comment.author)}</div>
                    <div class="comment-body">
                        <div class="comment-head">
                            <div>
                                <p class="comment-author">${displayName(comment.author)}</p>
                                <p class="comment-date">
                                    ${formatShortDate(comment.date)}
                                    ${comment.editedAt ? `<span class="comment-edited">· edited (${formatShortDate(comment.editedAt)})</span>` : ''}
                                </p>
                            </div>
                            <div class="reactions">
                                <form class="reaction-form" action="/blogs/${blog._id}/comments/${comment._id}/like" method="POST">
                                    <button type="submit" class="reaction-btn ${hasReacted(comment.likes) ? 'liked' : ''}">
                                        <img src="${hasReacted(comment.likes) ? '/images/thumbs-up-bold.svg' : '/images/thumbs-up.svg'}">
                                    </button>
                                </form>
                                <div class="likes-count">
                                    <p>${reactionCount(comment.likes) - reactionCount(comment.dislikes)}</p>
                                </div>
                                <form class="reaction-form" action="/blogs/${blog._id}/comments/${comment._id}/dislike" method="POST">
                                    <button type="submit" class="reaction-btn ${hasReacted(comment.dislikes) ? 'disliked' : ''}">
                                        <img src="${hasReacted(comment.dislikes) ? '/images/thumbs-down-bold.svg' : '/images/thumbs-down.svg'}">
                                    </button>
                                </form>
                            </div>
                        </div>
                        <p class="comment-content" id="content-${comment._id}">${comment.content}</p>

                        ${isOwner(comment.author) ? `
                            <form class="edit-form" id="edit-form-${comment._id}"
                                action="/blogs/${blog._id}/comments/${comment._id}/edit" method="POST">
                                <textarea name="content" required>${comment.content}</textarea>
                                <div class="edit-form-actions">
                                    <button type="submit" class="edit-submit">Save</button>
                                    <button type="button" class="edit-cancel" data-comment-id="${comment._id}">Cancel</button>
                                </div>
                            </form>` : ''}

                        <div class="comment-actions">
                            <button type="button" class="comment-reply" data-comment-id="${comment._id}">Reply</button>
                            ${isOwner(comment.author) ? `<button type="button" class="comment-edit" data-comment-id="${comment._id}">Edit</button>` : ''}
                            ${isOwner(comment.author) || isBlogAuthor ? `
                                <form class="delete-form" action="/blogs/${blog._id}/comments/${comment._id}/delete" method="POST">
                                    <button type="submit" class="comment-delete">Delete</button>
                                </form>` : ''}
                        </div>

                        <form class="reply-form" id="reply-form-${comment._id}"
                            action="/blogs/${blog._id}/comments/${comment._id}/replies" method="POST">
                            <textarea name="content" placeholder="Write a reply..." required></textarea>
                            <div class="reply-form-actions">
                                <button type="submit" class="reply-submit">Reply</button>
                                <button type="button" class="reply-cancel" data-comment-id="${comment._id}">Cancel</button>
                            </div>
                        </form>

                        ${repliesHTML}
                    </div>
                </div>`;
        });
    }

    commentList.insertAdjacentHTML("beforeend", commentBody);
};

fillComments();