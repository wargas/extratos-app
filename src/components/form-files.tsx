'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import axios from "axios";
import EventEmitter from "eventemitter3";
import { DownloadIcon, PlayIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const eventEmitter = new EventEmitter()
const CHANGE_STATUS_NAME = 'change-status'

export function FormFiles({ tipos }: { tipos: { name: string, id: string }[] }) {
    const [files, setFiles] = useState<{ file: File, tipo: string, id: string, csv?: string, status?: string }[]>([])
    const [tipo, setTipo] = useState('')

    const refInputFile = useRef<HTMLInputElement>(null)


    function handleClickAdicionar(): void {
        if (!refInputFile.current) {
            return;
        }
        const list = Array.from(refInputFile.current.files || [])
            .map(f => ({
                file: f,
                tipo: tipo,
                status: 'Iniciando',
                id: Math.random().toString(36).substring(2, 15)
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

    function dispatchChangeStatus(id: string, status: string) {
        eventEmitter.emit(CHANGE_STATUS_NAME, id, status)
    }

    const handleProcess = useCallback(async function (id: string) {

        dispatchChangeStatus(id, 'Iniciando')

        const formData = new FormData()

        const file = files.find(f => f.id == id)

        if (!file) {
            return;
        }

        formData.append('file', file.file)
        const { data } = await axios.post<{ csv: string }>(`https://extratos-api.deltex.com.br/direct?template=${tipo}`, formData)

        dispatchChangeStatus(id, 'Concluído')

        setFiles(prev => prev.map(f => {
            if (f.id == id) {
                f.status = 'Concluído'
                f.csv = data.csv
            }
            return f;
        }))

    }, [files, tipo])

    const handleChangeStatus = useCallback((id: string, status: string) => {
        setFiles(prev => {

            return prev.map(p => {
                if (p.id == id) {
                    p.status = status
                }

                return p
            })
        })
    }, [files, tipo])

    useEffect(() => {

        eventEmitter.on(CHANGE_STATUS_NAME, handleChangeStatus)

        return () => {
            eventEmitter.off(CHANGE_STATUS_NAME, handleChangeStatus)
        }

    }, [])

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
            <div className="mt-4 border-t">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tamanho</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {files.map(({ file, tipo, id, csv = null, status = '' }) => (
                            <TableRow key={id}>
                                <TableCell>{file.name}</TableCell>
                                <TableCell>{file.size}</TableCell>
                                <TableCell>{tipo}</TableCell>
                                <TableCell>{status}</TableCell>
                                <TableCell>
                                    <div className="flex justify-end">
                                        {csv && <Button size={'sm'} variant={'ghost'} asChild>
                                            <a target="_blank" href={csv}>
                                                <DownloadIcon />
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
                    <Button disabled>Processar Todos</Button>
                </div>
            </div>
        </div>
    );
}