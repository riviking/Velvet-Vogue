import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: './.env.local' })

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY

console.log('Testing Supabase connection with:')
console.log('URL:', url)
console.log('Key exists:', !!key)

const supabase = createClient(url, key)

async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .limit(1)

        if (error) {
            console.error('Database Error:', error)
            return
        }

        console.log('Connection successful! ✅')
        console.log('Sample data:', data)

    } catch (err) {
        console.error('Connection failed:', err.message)
    }
}

testConnection()