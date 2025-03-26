export enum FILE_STATUS {
    ADDED,
    PROCESSING,
    SUCCESS,
    ERROR
}

export type FileItem = {
    file: File, tipo: string, id: string, csv?: string, registros?: number, status: FILE_STATUS, selected: boolean
}