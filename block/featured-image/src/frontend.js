import './frontend.scss'
import { createRoot } from '@wordpress/element';
import Groups from "./frontend/groups";

const divsToUpdate = document.querySelectorAll(".block-featured-image")

divsToUpdate.forEach(function(div) {
    const root = createRoot(div);
    const groups = JSON.parse(div.getAttribute("data-attributes"))
    root.render(<Groups
            groups={groups}
        />)
    div.classList.remove("block-featured-image")
})

