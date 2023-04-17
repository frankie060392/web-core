import type { NextPage } from 'next'
import Head from 'next/head'
import SafeImprint from '@/components/imprint'

const Imprint: NextPage = () => {
  return (
    <>
      <Head>
        <title>U2U Multisign – Imprint</title>
      </Head>

      <main>
        <SafeImprint />
      </main>
    </>
  )
}

export default Imprint
