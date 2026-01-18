/*
 * DataConductor
 * Copyright (C) 2026
 */

import { NodeHandler } from '../registry';
import { Transform } from 'stream';
import { createJsonInputStream } from '../../streamUtils';

export const openaiHandler: NodeHandler = {
    async execute(ctx) {
        console.log('Executing OpenAI Node...', ctx.config);

        try {
            const inputRef = ctx.inputs[0];
            if (!inputRef || !inputRef.filePath) {
                throw new Error('No input file provided for OpenAI processing');
            }

            const filePath = inputRef.filePath;
            const { endpoint, apiKey, model, prompt, temperature = 0.7, max_tokens, jsonMode } = ctx.config;

            if (!endpoint) throw new Error('OpenAI Endpoint URL is required');
            if (!model) throw new Error('Model name is required');
            if (!prompt) throw new Error('Prompt template is required');

            // Create Transform Stream
            const transformStream = new Transform({
                objectMode: true,
                async transform(chunk, encoding, callback) {
                    try {
                        // Interpolate prompt
                        let interpolatedPrompt = prompt;
                        if (typeof chunk === 'object' && chunk !== null) {
                            for (const [key, value] of Object.entries(chunk)) {
                                interpolatedPrompt = interpolatedPrompt.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
                            }
                        }
                        interpolatedPrompt = interpolatedPrompt.replace(/{{\s*json\s*}}/g, JSON.stringify(chunk));

                        // Detect if we are waiting for chat completion or text completion
                        const isChatApi = endpoint.includes('/chat/completions');
                        let payload: any;

                        if (isChatApi) {
                            const messages: any[] = [];

                            // If JSON is expected, add a system prompt to enforce it
                            if (jsonMode || ctx.config.parseJsonResponse) {
                                messages.push({
                                    role: 'system',
                                    content: 'You are a helpful assistant that outputs ONLY valid JSON. Do not include any markdown formatting (like ```json), preamble, or explanation.'
                                });
                            }

                            messages.push({ role: 'user', content: interpolatedPrompt });

                            payload = {
                                model: model,
                                messages: messages,
                                temperature: Number(temperature),
                                ...(max_tokens ? { max_tokens: Number(max_tokens) } : {}),
                                ...(jsonMode ? { response_format: { type: 'json_object' } } : {})
                            };
                        } else {
                            // Legacy/Text Completion API
                            let finalPrompt = interpolatedPrompt;
                            if (jsonMode || ctx.config.parseJsonResponse) {
                                finalPrompt += "\n\nOutput ONLY valid JSON. Do not include markdown or explanations.";
                            }

                            payload = {
                                model: model,
                                prompt: finalPrompt,
                                temperature: Number(temperature),
                                ...(max_tokens ? { max_tokens: Number(max_tokens) } : {})
                            };
                        }

                        const response = await fetch(endpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify(payload)
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText} - ${errorText}`);
                        }

                        const data: any = await response.json();
                        let content = '';

                        if (isChatApi) {
                            content = data.choices?.[0]?.message?.content || '';
                        } else {
                            content = data.choices?.[0]?.text || '';
                        }

                        // Determine output format
                        // We attach the AI response to the original chunk or return just the response?
                        // "Processing Node" usually enriches. Let's return a new object with original + response.
                        // Or if the user wants just the response, they can use a subsequent Transform node.
                        // For flexibility, let's append it to a field '_ai_response' or just return the result if it tries to be JSON.

                        // Let's settle on: Output is the original chunk + defined 'outputField' or '_ai_response'
                        const outputField = ctx.config.outputField || '_ai_response';

                        const newChunk = { ...chunk, [outputField]: content };

                        // Try to parse JSON if the prompt asked for JSON
                        if (ctx.config.parseJsonResponse) {
                            try {
                                // Naive cleanup of markdown blocks if present
                                const cleanJson = content.replace(/```json\n?|\n?```/g, '');
                                newChunk[outputField] = JSON.parse(cleanJson);
                            } catch (e) {
                                // Keep as string if parse fails
                            }
                        }

                        this.push(newChunk);
                        callback();
                    } catch (err: any) {
                        console.error('Error processing chunk with OpenAI:', err);
                        // Start creating an error object/stream instead of crashing? 
                        // For now, simple callback error
                        callback(err);
                    }
                }
            });

            const inputStream = await createJsonInputStream(filePath);
            inputStream.pipe(transformStream);

            return {
                success: true,
                output: transformStream
            };

        } catch (error: any) {
            console.error('OpenAI processing failed:', error);
            return {
                success: false,
                error: `OpenAI initialization failed: ${error.message}`
            };
        }
    }
};
