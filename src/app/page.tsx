import { FormFiles } from "@/components/form-files";
import axios from "axios";

export default async function Home() {

  const { data: lista } = await axios.get(`https://extratos-api.deltex.com.br/list`)

  return (
    <FormFiles tipos={lista} />
  )
}
