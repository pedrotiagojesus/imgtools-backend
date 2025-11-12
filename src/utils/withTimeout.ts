import { TimeoutError } from '../errors';
import { env } from '../config/env';

/**
 * Wraps a promise with a timeout
 * Throws TimeoutError if the operation exceeds the configured timeout
 *
 * @param promise - The promise to wrap with timeout
 * @param timeoutMs - Timeout in milliseconds (defaults to REQUEST_TIMEOUT_MS)
 * @param operationName - Name of the operation for error messages
 * @returns The result of the promise if it completes in time
 * @throws TimeoutError if the operation exceeds the timeout
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = env.REQUEST_TIMEOUT_MS,
    operationName: string = 'Operation'
): Promise<T> {
    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
            reject(new TimeoutError(`${operationName} exceeded timeout of ${timeoutMs}ms`));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutHandle!);
        return result;
    } catch (error) {
        clearTimeout(timeoutHandle!);
        throw error;
    }
}
