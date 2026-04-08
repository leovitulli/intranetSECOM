import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, X } from 'lucide-react';
import { sanitizeText } from '../../../utils/sanitize';
import type { Task } from '../../../types/kanban';

interface CommentSystemProps {
    task: Task;
    tabName: string;
    user: any;
    newComment: string;
    setNewComment: (v: string) => void;
    handleAddComment: (e: React.FormEvent) => void;
    isViewer: boolean;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
    task,
    tabName,
    user,
    newComment,
    setNewComment,
    handleAddComment,
    isViewer
}) => {
    const filtered = task.comments.filter(c =>
        tabName === 'geral' ? (!c.tab || c.tab === 'geral') : c.tab === tabName
    );

    return (
        <div className="comment-system-container">
            <div className="comments-list">
                {filtered.length > 0 ? filtered.map(comment => (
                    <div key={comment.id} className="comment">
                        <img src={comment.avatar} alt={comment.author} className="comment-avatar" />
                        <div className="comment-bubble">
                            <div className="comment-meta">
                                <span className="comment-author">{comment.author}</span>
                                <span className="comment-date">
                                    {format(new Date(comment.date), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                </span>
                            </div>
                            <p className="comment-text">{sanitizeText(comment.text)}</p>
                        </div>
                        {(user?.role === 'admin' || user?.role === 'desenvolvedor' || user?.name === comment.author) && (
                            <div className="comment-actions" style={{ marginLeft: 10, display: 'flex', gap: 5, opacity: 0.5, alignItems: 'center' }}>
                                <button className="icon-btn-small" title="Excluir (em breve)" style={{ cursor: 'not-allowed' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )) : (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                        Nenhum comentário nesta aba ainda.
                    </p>
                )}
            </div>

            {!isViewer && (
                <form onSubmit={handleAddComment} className="comment-input-area">
                    <img src={user?.avatar} alt="You" className="comment-avatar" />
                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder={tabName === 'geral' ? 'Escreva um comentário geral...' : `Comentar sobre ${tabName}...`}
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                        />
                        <button type="submit" disabled={!newComment.trim()}>
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};
