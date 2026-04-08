import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Task, Attachment } from '../types/kanban';
import { useAuth } from '../contexts/AuthContext';
import { useTaskModal } from '../hooks/useTaskModal';
import FileViewer from './FileViewer';

// Components
import { TaskModalHeader } from './TaskModal/components/TaskModalHeader';
import { TaskModalTabsNav } from './TaskModal/components/TaskModalTabsNav';
import { TaskModalSidebar } from './TaskModal/components/TaskModalSidebar';
import { SaveBanner } from './TaskModal/components/SaveBanner';

// Tabs
import { GeralTab } from './TaskModal/tabs/GeralTab';
import { ReleaseTab } from './TaskModal/tabs/ReleaseTab';
import { PostTab } from './TaskModal/tabs/PostTab';
import { VideoTab } from './TaskModal/tabs/VideoTab';
import { FotoTab } from './TaskModal/tabs/FotoTab';
import { ArteTab } from './TaskModal/tabs/ArteTab';
import { InauguracaoTab } from './TaskModal/tabs/InauguracaoTab';

import './TaskModal.css';

interface TaskModalProps {
    task: Task;
    onClose: () => void;
    onUpdateTask: (updatedTask: Task) => void;
    onArchive?: () => void;
}

// ─── Modal de Confirmação interno ───────────────────────────────────────────
function ConfirmDialog({
    open, title, message, onConfirm, onCancel
}: {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onCancel}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white', borderRadius: '20px',
                    padding: '2rem', maxWidth: '420px', width: '90%',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    display: 'flex', flexDirection: 'column', gap: '1.25rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: '#fff7ed', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#ea580c', flexShrink: 0
                    }}>
                        <AlertTriangle size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{message}</p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 18px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                            background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                        }}
                    >Cancelar</button>
                    <button
                        onClick={() => { onConfirm(); onCancel(); }}
                        style={{
                            padding: '8px 18px', borderRadius: '10px', border: 'none',
                            background: '#1e293b', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                        }}
                    >Confirmar</button>
                </div>
            </div>
        </div>
    );
}

export default function TaskModal({ task, onClose, onUpdateTask, onArchive }: TaskModalProps) {
    const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
    const isViewer = useAuth().user?.role === 'viewer';

    const modalData = useTaskModal(task, onUpdateTask, onClose);

    const {
        user,
        editedTask,
        hasUnsavedChanges,
        activeTab,
        newComment,
        uploadingAttachments,
        activityLogs,
        confirmDialog,
        fileInputRef,
        // edição inline
        isEditingTitle, setIsEditingTitle,
        editTitleContent, setEditTitleContent,
        isEditingDesc, setIsEditingDesc,
        editDescContent, setEditDescContent,
        isEditingAgendamento, setIsEditingAgendamento,
        isEditingEquipe, setIsEditingEquipe,
        isEditingExtras, setIsEditingExtras,
        isEditingRelease, setIsEditingRelease,
        isEditingVideo, setIsEditingVideo,
        isEditingFoto, setIsEditingFoto,
        isEditingArte, setIsEditingArte,
        isEditingPost, setIsEditingPost,
        isEditingInauguracao, setIsEditingInauguracao,
        // actions
        setActiveTab,
        setNewComment,
        handleFieldChange,
        handleSave,
        handleSaveSection,
        handleAddComment,
        handleFileUpload,
        handleRemoveAttachment,
        handleArchive,
        handleDelete,
        handleDiscard,
        closeConfirm,
        getDayOfWeek,
        unarchiveTask,
        isSaving,
        saveError,
    } = modalData;

    const commonTabProps = {
        task: editedTask,
        isViewer,
        user,
        newComment,
        setNewComment,
        handleAddComment,
        onFieldChange: handleFieldChange,
        onSaveSection: handleSaveSection,
        isSaving,
    };

    return (
        <>
            <div className="modal-overlay" onClick={() => hasUnsavedChanges ? {} : onClose()}>
                <div className="modal-content nova-pauta-modal-premium" onClick={e => e.stopPropagation()}>
                    <div className="nova-pauta-body-premium">
                        
                        <TaskModalHeader 
                            task={editedTask}
                            isEditingTitle={isEditingTitle}
                            setIsEditingTitle={setIsEditingTitle}
                            editTitleContent={editTitleContent}
                            setEditTitleContent={setEditTitleContent}
                            isViewer={isViewer}
                            onClose={onClose}
                            onFieldChange={handleFieldChange}
                        />

                        <TaskModalTabsNav 
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            task={editedTask}
                        />

                        <div className="modal-body">
                            <div className="modal-main-col-premium">
                                {activeTab === 'geral' && (
                                    <GeralTab 
                                        {...commonTabProps}
                                        editingStates={{ isEditingDesc, isEditingAgendamento, isEditingEquipe, isEditingExtras }}
                                        setEditingStates={{ setIsEditingDesc, setIsEditingAgendamento, setIsEditingEquipe, setIsEditingExtras }}
                                        editDescContent={editDescContent}
                                        setEditDescContent={setEditDescContent}
                                        onFileUpload={handleFileUpload}
                                        onRemoveAttachment={handleRemoveAttachment}
                                        getDayOfWeek={getDayOfWeek}
                                        fileInputRef={fileInputRef}
                                        uploadingAttachments={uploadingAttachments}
                                        setViewingFile={(att) => setViewingFile(att)}
                                    />
                                )}

                                {activeTab === 'release' && (
                                    <ReleaseTab 
                                        {...commonTabProps}
                                        isEditingRelease={isEditingRelease}
                                        setIsEditingRelease={setIsEditingRelease}
                                    />
                                )}

                                {activeTab === 'post' && (
                                    <PostTab 
                                        {...commonTabProps}
                                        isEditingPost={isEditingPost}
                                        setIsEditingPost={setIsEditingPost}
                                        getDayOfWeek={getDayOfWeek}
                                    />
                                )}

                                {activeTab === 'video' && (
                                    <VideoTab 
                                        {...commonTabProps}
                                        isEditingVideo={isEditingVideo}
                                        setIsEditingVideo={setIsEditingVideo}
                                    />
                                )}

                                {activeTab === 'foto' && (
                                    <FotoTab 
                                        {...commonTabProps}
                                        isEditingFoto={isEditingFoto}
                                        setIsEditingFoto={setIsEditingFoto}
                                    />
                                )}

                                {activeTab === 'arte' && (
                                    <ArteTab 
                                        {...commonTabProps}
                                        isEditingArte={isEditingArte}
                                        setIsEditingArte={setIsEditingArte}
                                    />
                                )}

                                {activeTab === 'inauguracao' && (
                                    <InauguracaoTab 
                                        {...commonTabProps}
                                        isEditingInauguracao={isEditingInauguracao}
                                        setIsEditingInauguracao={setIsEditingInauguracao}
                                    />
                                )}
                            </div>

                            <TaskModalSidebar 
                                task={editedTask}
                                isViewer={isViewer}
                                user={user}
                                activityLogs={activityLogs}
                                onUnarchive={unarchiveTask}
                                onArchive={() => handleArchive(onArchive)}
                                onClose={onClose}
                                onDelete={handleDelete}
                                onFieldChange={handleFieldChange}
                            />
                        </div>
                    </div>

                    <SaveBanner 
                        show={hasUnsavedChanges}
                        onDiscard={handleDiscard}
                        onSave={handleSave}
                        isSaving={isSaving}
                        saveError={saveError}
                    />
                </div>
            </div>

            {viewingFile && (
                <FileViewer 
                    attachment={viewingFile} 
                    attachments={editedTask.attachments || []} 
                    onClose={() => setViewingFile(null)} 
                />
            )}

            <ConfirmDialog 
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />
        </>
    );
}
