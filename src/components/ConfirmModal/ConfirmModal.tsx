import { observer } from 'mobx-react-lite';
import { uiStore } from '@/store';
import { Modal, Button } from '@/components/UI';
import styles from './ConfirmModal.module.scss';

export const ConfirmModal = observer(() => {
  const { confirmModalState, confirmAction, cancelAction } = uiStore;

  return (
    <Modal
      isOpen={confirmModalState.isOpen}
      onClose={cancelAction}
      title={confirmModalState.title}
      size="sm"
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" onClick={cancelAction}>
            Отмена
          </Button>
          <Button variant="danger" onClick={confirmAction}>
            Удалить
          </Button>
        </div>
      }
    >
      <p className={styles.message}>{confirmModalState.message}</p>
    </Modal>
  );
});
