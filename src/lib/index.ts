// place files you want to import through the `$lib` alias in this folder.

export const formatExpiry = (expiresAt: number) =>
    new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(expiresAt));