import "./global.css"
export const metadata = {
    title : "F1GPT",
    description : "Your AI-powered Formula 1 assistant",
}

const RootLayout = ({children}) => {
    return (
        <html lang="en">
        <body>{children}</body>
        </html>
    )
}

export default RootLayout;