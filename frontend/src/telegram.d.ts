interface Window {
    Telegram?: {
        WebApp: {
            ready: () => void;
            expand: () => void;
            close: () => void;
            initData: string;
            initDataUnsafe: {
                start_param?: string;
                user?: {
                    id: number;
                    first_name: string;
                    username?: string;
                };
            };
            BackButton: {
                show: () => void;
                hide: () => void;
                onClick: (fn: () => void) => void;
                offClick: (fn: () => void) => void;
            };
            MainButton: {
                text: string;
                show: () => void;
                hide: () => void;
                onClick: (fn: () => void) => void;
            };
        };
    };
}