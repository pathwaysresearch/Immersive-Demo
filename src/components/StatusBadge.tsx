import './StatusBadge.css';

type Status = 'connected' | 'connecting' | 'disconnected';

interface StatusBadgeProps {
    status: Status;
}

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
    connected: { label: 'Connected', color: 'status--connected' },
    connecting: { label: 'Connecting…', color: 'status--connecting' },
    disconnected: { label: 'Disconnected', color: 'status--disconnected' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status];
    return (
        <div className={`status-badge ${config.color}`}>
            <span className="status-dot" />
            <span className="status-label">{config.label}</span>
        </div>
    );
}
