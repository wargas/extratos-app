'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import axios from "axios";
import EventEmitter from "eventemitter3";
import { filter } from "lodash";
import { AlertCircleIcon, DownloadIcon, Loader2Icon, PlayIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "./ui/checkbox";

const eventEmitter = new EventEmitter()
const CHANGE_STATUS_NAME = 'change-status'
enum FILE_STATUS {
    ADDED,
    PROCESSING,
    SUCCESS,
    ERROR
}

type FileItem = {
    file: File, tipo: string, id: string, csv?: string, status?: FILE_STATUS, selected: boolean
}

export function FormFiles({ tipos }: { tipos: { name: string, id: string }[] }) {
    const [files, setFiles] = useState<FileItem[]>([])
    const [tipo, setTipo] = useState('')

    const refInputFile = useRef<HTMLInputElement>(null)

    const listSelecteds = useMemo(() => {
        return filter(files, 'selected')
    }, [files])

    function handleClickAdicionar(): void {
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
            const { data } = await axios.post<{ csv: string }>(`https://extratos-api.deltex.com.br/direct?template=${tipo}`, formData)

            dispatchChangeStatus(id, FILE_STATUS.SUCCESS)

            setFiles(prev => prev.map(f => {
                if (f.id == id) {
                    f.status = FILE_STATUS.SUCCESS
                    f.csv = data.csv
                }
                return f;
            }))
        } catch (error) {

            dispatchChangeStatus(id, FILE_STATUS.ERROR)
        }

    }, [files, tipo])

    const handleChangeStatus = useCallback((id: string, status: FILE_STATUS) => {
        console.log(id, status)
        setFiles(prev => {

            return prev.map(p => {
                if (p.id == id) {
                    p.status = status
                }

                return p
            })
        })
    }, [files, tipo])

    

    function handleChangeSelected(id: string, v: string | boolean): void {

        if(id == '') {
            setFiles(prev => prev.map(f => ({...f, selected: v as boolean})))
        }
        
        if(id.length > 0) {
            setFiles(prev => {
                return prev.map(f => {
                    if(id == f.id) {
                        f.selected = v as boolean
                    }
                    return f
                })
            })
        }
    }

    useEffect(() => {

        eventEmitter.on(CHANGE_STATUS_NAME, handleChangeStatus)

        return () => {
            eventEmitter.off(CHANGE_STATUS_NAME, handleChangeStatus)
        }

    }, [files])

    return (
        <div className="w-full container mx-auto mt-4">

            <div className="flex gap-4">
                <Input ref={refInputFile} type="file" multiple />
                <Select onValueChange={v => setTipo(v)}>
                    <SelectTrigger>
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
                <Button disabled={tipo == ''} onClick={handleClickAdicionar}>Adicionar</Button>
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
                                    <Checkbox onCheckedChange={v => handleChangeSelected('', v)} />
                                </TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Tamanho</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {files.map(({ file, tipo, id, csv = null, status = '', selected }) => (
                                <TableRow key={id}>
                                    <TableHead>
                                    <Checkbox checked={selected} onCheckedChange={(v) => handleChangeSelected(id, v)} />
                                    </TableHead>
                                    <TableCell>{file.name}</TableCell>
                                    <TableCell>{file.size}</TableCell>
                                    <TableCell>{tipo}</TableCell>
                                    <TableCell>{status}</TableCell>
                                    <TableCell>
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
                                                <a target="_blank" href={csv}>
                                                    <DownloadIcon color="green" />
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
                    <div className="flex justify-end border-t pt-4">
                        <Button disabled={listSelecteds.length == 0}>Processar Todos ({listSelecteds.length})</Button>
                    </div>
                </div>
            )}
        </div>
    );
}