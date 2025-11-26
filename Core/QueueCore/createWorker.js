import { getConnection } from '../../config/rabbit.js';
import registerJobs from './registerJobs.js';

/**
 * Lógica de criação do entrypoint worker
 * Registro e event loop
 * Podemos escolher o diretório de registro dos Jobs
 */
export default async function createWorker(dir) {
    /** Registro dos jobs */
    const jobMap = await registerJobs(dir);

    /**
     * listen(queue, type)
     *
     * queue: nome da fila (string)
     * type:
     *   - undefined  => worker normal (consome direto da fila)
     *   - 'websocket' => worker ligado num exchange fanout
     */
    async function listen(queue = 'default', exchange = undefined) {
        const channel = await getConnection();

        // sempre garante a fila
        await channel.assertQueue(queue, { durable: true });

        // corrigido: só tenta criar exchange se não for undefined
        if (exchange != null) {
            console.log(`[WORKER] Ligando ao exchange "${exchange}" (fanout) com queue "${queue}"`); // log adicionado
            await channel.assertExchange(exchange, 'fanout', { durable: true });
            await channel.bindQueue(queue, exchange, '');
        }

        // concorrência fixa em 1
        await channel.prefetch(1);

        channel.consume(queue, async (msg) => {
            if (!msg) return;

            const start = Date.now();

            try {
                const { job, payload } = JSON.parse(msg.content.toString());
                const jobHandle = jobMap[job];

                if (!jobHandle) throw new Error(`Job "${job}" não registrado`);

                console.log(`[WORKER] Executando ${job} da fila "${queue}"`);
                await jobHandle(payload);

                const duration = ((Date.now() - start) / 1000).toFixed(3);
                console.log(`[WORKER] Executado ${job} da fila "${queue}" (Finalizado em ${duration}s)`);

                channel.ack(msg);
            } catch (err) {
                console.error(`[WORKER] Erro ao processar job:`, err);
                channel.nack(msg, false, false);
            }
        });

        console.log(`[WORKER] Fila: "${queue}"`);
        console.log(`[WORKER] Tipo: ${exchange || 'normal'}`);
    }

    return { listen };
}
