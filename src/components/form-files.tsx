'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import axios from "axios";
import EventEmitter from "eventemitter3";
import { filesize } from 'filesize';
import { filter } from "lodash";
import { AlertCircleIcon, DownloadIcon, Loader2Icon, PlayIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { FILE_STATUS, FileItem } from "@/types/types";
import { FileState } from "./file-state";

const eventEmitter = new EventEmitter()
const CHANGE_STATUS_NAME = 'change-status'


export function FormFiles({ tipos }: { tipos: { name: string, id: string }[] }) {
    const [files, setFiles] = useState<FileItem[]>([])
    const [tipo, setTipo] = useState('')

    const refInputFile = useRef<HTMLInputElement>(null)

    const listSelecteds = useMemo(() => {
        return filter(files, 'selected')
    }, [files])

    function handleChangeInputFiles(): void {
        if (!refInputFile.current) {
            return;
        }
        const list = Array.from(refInputFile.current.files || [])
            .map(f => ({
                file: f,
                tipo: tipo,
                status: FILE_STATUS.ADDED,
                id: Math.random().toString(36).substring(2, 15),
                selected: false
            }))

        if (list.length == 0) {
            return;
        }

        setFiles(prev => [...prev, ...list])

        refInputFile.current.value = ''
    }

    function handleDelete(item: string): void {
        setFiles(prev => prev.filter(p => p.id != item))
    }

    function dispatchChangeStatus(id: string, status: FILE_STATUS) {

        eventEmitter.emit(CHANGE_STATUS_NAME, id, status)
    }

    const handleProcess = useCallback(async function (id: string) {

        try {
            dispatchChangeStatus(id, FILE_STATUS.PROCESSING)

            const formData = new FormData()

            const file = files.find(f => f.id == id)

            if (!file) {
                return;
            }

            formData.append('file', file.file)
            const { data } = await axios.post<{ csv: string, registros: number }>(`https://extratos-api.deltex.com.br/direct?template=${file.tipo}`, formData)

            dispatchChangeStatus(id, FILE_STATUS.SUCCESS)

            setFiles(prev => prev.map(f => {
                if (f.id == id) {
                    f.status = FILE_STATUS.SUCCESS
                    f.csv = data.csv
                    f.registros = data.registros
                }
                return f;
            }))
        } catch (error) {

            dispatchChangeStatus(id, FILE_STATUS.ERROR)
        }

    }, [files, tipo])

    const handleChangeStatus = useCallback((id: string, status: FILE_STATUS) => {
        changeFile(id, { status: status })
    }, [files, tipo])

    const changeFile = useCallback((id: string, data: Partial<FileItem>) => {
        setFiles(prev => {
            return prev.map(f => {
                if (f.id == id || id == '') {
                    return { ...f, ...data }
                }

                return f;
            });
        })
    }, [files])

    useEffect(() => {

        eventEmitter.on(CHANGE_STATUS_NAME, handleChangeStatus)

        return () => {
            eventEmitter.off(CHANGE_STATUS_NAME, handleChangeStatus)
        }

    }, [files])

    async function processSelecteds() {
        await Promise.all(listSelecteds.map(i => handleProcess(i.id)))
    }

    function deleteAll(): void {
        listSelecteds.forEach(i => handleDelete(i.id))
    }

    return (
        <div className="w-full container mx-auto mt-4">

            <div className="flex gap-4">
                <Select onValueChange={v => setTipo(v)}>
                    <SelectTrigger className="w-96">
                        <SelectValue placeholder="Tipo de Extrato" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            {tipos.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <Button disabled={tipo == ''} variant="outline" onClick={() => refInputFile.current?.click()}>Selecionar arquivos</Button>
                <Input className="hidden" onChange={handleChangeInputFiles} ref={refInputFile} type="file" multiple />

            </div>
            {files.length == 0 && (
                <div className="flex min-h-96 items-center justify-center">
                    <span className="text-gray-300">Selecione arquivos para processar</span>
                </div>
            )}
            {files.length > 0 && (
                <div className="mt-4 border-t">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <Checkbox onCheckedChange={v => changeFile('', { selected: !!v })} />
                                </TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Tamanho</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {files.map(({ file, tipo, id, csv = null, status, selected, registros }) => (
                                <TableRow key={id}>
                                    <TableHead>
                                        <Checkbox checked={selected} onCheckedChange={(v) => changeFile(id, { selected: !!v })} />
                                    </TableHead>
                                    <TableCell>{file.name}</TableCell>
                                    <TableCell>{filesize(file.size, { round: 1 })}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button className="px-0" variant={'link'}>
                                                    {tipos.find(t => t.id == tipo)?.name || ''}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {tipos.filter(t => t.id != tipo).map(t => (
                                                    <DropdownMenuItem onClick={() => changeFile(id, { tipo: t.id })} key={t.id}>{t.name}</DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell>
                                        <FileState status={status} registros={registros} />
                                        {/* <Badge>
                                            {
                                                ["PENDENTE", "RODANDO", "CONCLUIDO", "FALHOU"][parseInt(status.toString())]
                                            }
                                        </Badge> &nbsp;
                                        {registros && (
                                            <span className="text-xs text-stone-600">({registros})</span>
                                        )} */}
                                    </TableCell>
                                    <TableCell className="py-0">
                                        <div className="flex items-center justify-end">
                                            {status == FILE_STATUS.PROCESSING && (
                                                <Button size={'sm'} variant={'ghost'}>
                                                    <Loader2Icon className="animate-spin" />
                                                </Button>
                                            )}
                                            {status == FILE_STATUS.ERROR && (
                                                <Button size={'sm'} variant={'ghost'}>
                                                    <AlertCircleIcon color="red" size={10} />
                                                </Button>
                                            )}
                                            {status == FILE_STATUS.SUCCESS && csv && <Button size={'sm'} variant={'ghost'} asChild>
                                                <a target="_blank" href={csv} className="text-green-800">
                                                   Baixar <DownloadIcon  />
                                                </a>
                                            </Button>}
                                            <Button onClick={() => handleProcess(id)} size={'sm'} variant={'ghost'}>
                                                <PlayIcon />
                                            </Button>
                                            <Button onClick={() => handleDelete(id)} size={'sm'} variant={'ghost'}>
                                                <Trash2Icon />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="flex gap-4 justify-end border-t pt-4">
                        <Button onClick={() => deleteAll()} variant={'destructive'} disabled={listSelecteds.length == 0}>
                            <Trash2Icon />
                            Excluir ({listSelecteds.length})
                        </Button>
                        <Button onClick={processSelecteds} disabled={listSelecteds.length == 0}>
                            <PlayIcon />
                            Processar ({listSelecteds.length})
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}