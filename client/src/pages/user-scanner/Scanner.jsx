import React, { useEffect, useRef, useState } from 'react'

export default function Scanner() {
	const [rfid, setRfid] = useState('')
	const [connected, setConnected] = useState(false)
	const [hidSupported, setHidSupported] = useState(typeof navigator !== 'undefined' && !!navigator.hid)
	const deviceRef = useRef(null)

	// Keyboard-fallback buffer
	const kbBuffer = useRef('')
	const kbLastAt = useRef(0)
	const KB_TIMEOUT = 20

	useEffect(() => {
		function onKeyDown(e) {
			const now = Date.now()
			if (now - kbLastAt.current > KB_TIMEOUT) {
				// start a new buffer
				kbBuffer.current = ''
			}
			kbLastAt.current = now

			// If Enter pressed, finalize buffer
			if (e.key === 'Enter') {
				if (kbBuffer.current.length > 0) {
					const tag = kbBuffer.current.trim()
					setRfid(tag)
					kbBuffer.current = ''
				}
				return
			}

			// Collect printable keys (letters, digits, punctuation)
			if (e.key && e.key.length === 1) {
				kbBuffer.current += e.key
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	// WebHID helpers
	// track last scanned value/time to avoid duplicates
	const lastScanRef = useRef({ value: null, ts: 0 })

	async function connectHID() {
		if (!navigator.hid) {
			setHidSupported(false)
			return
		}
		try {
			// request device - no filters so user can choose; you can add vendor/product filters
			const devices = await navigator.hid.requestDevice({ filters: [] })
			if (!devices || devices.length === 0) return
			const device = devices[0]
			deviceRef.current = device
			await device.open()
			setConnected(true)

			device.addEventListener('inputreport', (ev) => {
				// ev.data is a DataView
				try {
					const dv = ev.data
					let text = ''
					for (let i = 0; i < dv.byteLength; i++) {
						const v = dv.getUint8(i)
						// If device sends ASCII bytes directly
						if (v >= 32 && v <= 126) text += String.fromCharCode(v)
						// some devices send raw decimal digits as bytes > 127; map common cases
						else if (v >= 48 && v <= 57) text += String.fromCharCode(v)
					}
					if (text) {
						const tag = text.trim()
						if (tag) setRfid(tag)
					}
				} catch (err) {
					console.error('Failed to parse HID inputreport', err)
				}
			})
		} catch (err) {
			console.error('HID connect error', err)
		}
	}

	async function disconnectHID() {
		const d = deviceRef.current
		if (d) {
			try {
				await d.close()
			} catch (e) {
				// ignore
			}
			deviceRef.current = null
		}
		setConnected(false)
	}

	function clear() {
		setRfid('')
		kbBuffer.current = ''
	}

	useEffect(() => {
		// avoid duplicate logs: only log when value changes or after a short interval
		const last = lastScanRef.current || { value: null, ts: 0 }
		if (!rfid) return
		const now = Date.now()
		if (rfid === last.value && now - last.ts < 1000) return
		console.log('Scanned RFID:', rfid)
		lastScanRef.current = { value: rfid, ts: now }
	}, [rfid])

	return (
		<div style={{ padding: 16 }}>
			<h2>RFID Scanner</h2>
			<p>This page reads an HID RFID tag. It uses WebHID when available and a keyboard-fallback (most USB RFID readers act as keyboards).</p>

			<div style={{ marginBottom: 12 }}>
				<strong>HID support:</strong> {hidSupported ? 'Yes' : 'No / unavailable in this browser'}
			</div>

			<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
				<button onClick={connectHID} disabled={!hidSupported || connected}>Connect HID</button>
				<button onClick={disconnectHID} disabled={!connected}>Disconnect HID</button>
				<button onClick={clear}>Clear</button>
			</div>

			<div style={{ marginTop: 8 }}>
				<label style={{ display: 'block', marginBottom: 6 }}>Scanned RFID value:</label>
				<div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 6, minHeight: 36 }}>{rfid || <em>none</em>}</div>
			</div>

			<div style={{ marginTop: 12, color: '#555' }}>
				<p>Keyboard-fallback: focus anywhere and scan/tag; the reader usually sends the tag as keystrokes followed by Enter.</p>
			</div>
		</div>
	)
}

