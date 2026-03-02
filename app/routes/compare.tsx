import { type LoaderFunctionArgs, type MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
    return [
        { title: "Compare" },
        { name: "description", content: "Compare games with friends" },
    ];
};

export async function loader({ request }: LoaderFunctionArgs) {
    
}

export default function Compare() {
    

    return (
        <div>
            <h1>Compare games with friends</h1>          
        </div>
    );
}